import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { decimalToNumber, toDecimal } from "@/lib/api-response";

export interface CreateWarehouseInput {
  name: string;
  latitude: number | string | Prisma.Decimal;
  longitude: number | string | Prisma.Decimal;
  shippingBaseCost: number | string | Prisma.Decimal;
  priority?: number;
  active?: boolean;
}

export interface StockAdjustmentInput {
  warehouseId: string;
  productId: string;
  availableQuantity: number;
  reorderLevel?: number;
}

export interface ProposedSplit {
  orderLineId: string;
  warehouseId: string;
  quantity: number;
}

// Haversine formula to compute distance in km between two lat/lng points
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const fulfillmentService = {
  // ─── Warehouse Management ──────────────────────────────────────────────────
  async listWarehouses() {
    return prisma.warehouse.findMany({
      include: {
        stocks: {
          include: { product: true },
        },
        _count: { select: { stocks: true, fulfillmentLines: true } },
      },
      orderBy: { priority: "asc" },
    });
  },

  async createWarehouse(input: CreateWarehouseInput) {
    return prisma.warehouse.create({
      data: {
        name: input.name,
        latitude: toDecimal(input.latitude),
        longitude: toDecimal(input.longitude),
        shippingBaseCost: toDecimal(input.shippingBaseCost),
        priority: input.priority ?? 1,
        active: input.active ?? true,
      },
    });
  },

  // ─── Warehouse Stock & Reservations ────────────────────────────────────────
  async listStocks(filters?: { warehouseId?: string; productId?: string }) {
    return prisma.warehouseStock.findMany({
      where: {
        ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        ...(filters?.productId ? { productId: filters.productId } : {}),
      },
      include: {
        warehouse: true,
        product: true,
      },
      orderBy: [{ warehouse: { name: "asc" } }, { product: { name: "asc" } }],
    });
  },

  async adjustStock(input: StockAdjustmentInput) {
    const existing = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: input.warehouseId,
          productId: input.productId,
        },
      },
    });

    if (existing) {
      return prisma.warehouseStock.update({
        where: { id: existing.id },
        data: {
          availableQuantity: input.availableQuantity,
          ...(input.reorderLevel !== undefined ? { reorderLevel: input.reorderLevel } : {}),
        },
        include: { warehouse: true, product: true },
      });
    }

    return prisma.warehouseStock.create({
      data: {
        warehouseId: input.warehouseId,
        productId: input.productId,
        availableQuantity: input.availableQuantity,
        reservedQuantity: 0,
        reorderLevel: input.reorderLevel ?? 0,
      },
      include: { warehouse: true, product: true },
    });
  },

  // ─── Fulfillment Allocation Algorithm (Section 15) ──────────────────────────
  /**
   * Reads OrderLines, finds usable stock (available - reserved), scores warehouses:
   * score = distanceWeight * distance + shippingCostWeight * shippingBaseCost + shipmentPenalty
   * Prefers fewer warehouses when total cost is similar, allocates greedily,
   * reserves allocated stock, creates Backorders for unsatisfied quantities.
   */
  async allocateOrder(
    orderId: string,
    customerCoords = { lat: 40.7128, lng: -74.006 } // Default NY
  ) {
    // 1. Fetch Order and lines
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lines: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new Error(`Order '${orderId}' not found.`);
    }

    // 2. Fetch active warehouses and their stock
    const warehouses = await prisma.warehouse.findMany({
      where: { active: true },
      include: {
        stocks: true,
      },
    });

    if (warehouses.length === 0) {
      throw new Error("No active warehouses found for allocation.");
    }

    // Weights from Section 15
    const distanceWeight = 0.05;
    const shippingCostWeight = 1.0;
    const shipmentPenalty = 25.0; // Penalty per additional warehouse to prefer consolidated shipments

    // Track state across allocation process
    const lineAllocations: Array<{
      orderLineId: string;
      productId: string;
      warehouseId: string;
      quantity: number;
      shippingCost: number;
    }> = [];

    const backorders: Array<{
      orderLineId: string;
      quantity: number;
    }> = [];

    // Track simulated usable quantities during this allocation run
    const usableMap = new Map<string, number>(); // key: `${warehouseId}:${productId}`
    for (const w of warehouses) {
      for (const s of w.stocks) {
        const usable = Math.max(0, s.availableQuantity - s.reservedQuantity);
        usableMap.set(`${w.id}:${s.productId}`, usable);
      }
    }

    const usedWarehouses = new Set<string>();

    // 3. Allocate each order line greedily
    for (const line of order.lines) {
      let remainingQty = line.quantity;

      // Find all warehouses that stock this product and score them
      const candidates = warehouses
        .map((w) => {
          const key = `${w.id}:${line.productId}`;
          const usable = usableMap.get(key) ?? 0;
          const dist = calculateDistanceKm(
            customerCoords.lat,
            customerCoords.lng,
            decimalToNumber(w.latitude),
            decimalToNumber(w.longitude)
          );
          const baseShipping = decimalToNumber(w.shippingBaseCost);

          // If this warehouse is already used in this order, avoid shipment penalty!
          const penalty = usedWarehouses.has(w.id) ? 0 : shipmentPenalty;

          const score =
            distanceWeight * dist +
            shippingCostWeight * baseShipping +
            penalty +
            w.priority;

          return {
            warehouse: w,
            usable,
            distanceKm: dist,
            baseShipping,
            score,
          };
        })
        .filter((c) => c.usable > 0)
        .sort((a, b) => a.score - b.score);

      for (const candidate of candidates) {
        if (remainingQty <= 0) break;

        const allocQty = Math.min(remainingQty, candidate.usable);
        if (allocQty > 0) {
          const lineShippingCost = candidate.baseShipping;
          lineAllocations.push({
            orderLineId: line.id,
            productId: line.productId,
            warehouseId: candidate.warehouse.id,
            quantity: allocQty,
            shippingCost: lineShippingCost,
          });

          // Deduct from in-memory usable stock
          const key = `${candidate.warehouse.id}:${line.productId}`;
          usableMap.set(key, candidate.usable - allocQty);
          candidate.usable -= allocQty;
          remainingQty -= allocQty;

          usedWarehouses.add(candidate.warehouse.id);
        }
      }

      // If stock was insufficient across all warehouses, create a Backorder
      if (remainingQty > 0) {
        backorders.push({
          orderLineId: line.id,
          quantity: remainingQty,
        });
      }
    }

    // 4. Calculate total shipping cost and shipment count
    const totalShippingCost = lineAllocations.reduce((acc, a) => acc + a.shippingCost, 0);
    const shipmentCount = usedWarehouses.size || 1;
    const fulfillmentStatus = backorders.length > 0 ? "PARTIALLY_FULFILLED" : "FULFILLED";

    // 5. Persist fulfillment, fulfillment lines, backorders, and update reservations transactionally
    const result = await prisma.$transaction(async (tx) => {
      // Create Fulfillment
      const fulfillment = await tx.fulfillment.create({
        data: {
          orderId: order.id,
          status: fulfillmentStatus,
          estimatedShippingCost: toDecimal(totalShippingCost),
          shipmentCount,
        },
      });

      // Create Fulfillment Lines & reserve stock
      for (const alloc of lineAllocations) {
        await tx.fulfillmentLine.create({
          data: {
            fulfillmentId: fulfillment.id,
            orderLineId: alloc.orderLineId,
            warehouseId: alloc.warehouseId,
            quantity: alloc.quantity,
            shippingCost: toDecimal(alloc.shippingCost),
          },
        });

        // Reserve stock
        await tx.warehouseStock.update({
          where: {
            warehouseId_productId: {
              warehouseId: alloc.warehouseId,
              productId: alloc.productId,
            },
          },
          data: {
            reservedQuantity: { increment: alloc.quantity },
          },
        });
      }

      // Create Backorders
      for (const bo of backorders) {
        await tx.backorder.create({
          data: {
            orderLineId: bo.orderLineId,
            quantity: bo.quantity,
            status: "OPEN",
          },
        });
      }

      return fulfillment;
    });

    return {
      fulfillment: result,
      allocations: lineAllocations,
      backorders,
      shipmentCount,
      estimatedShippingCost: totalShippingCost,
    };
  },

  // ─── Manual Warehouse Override with Backend Stock Validation (Section 15) ───
  /**
   * Allows operator to manually assign split lines, validating that
   * proposed quantities do NOT exceed usable stock on the backend!
   */
  async overrideFulfillment(
    fulfillmentId: string,
    proposedSplits: ProposedSplit[]
  ) {
    const fulfillment = await prisma.fulfillment.findUnique({
      where: { id: fulfillmentId },
      include: {
        lines: {
          include: { warehouse: true },
        },
      },
    });

    if (!fulfillment) {
      throw new Error(`Fulfillment '${fulfillmentId}' not found.`);
    }

    // 1. Fetch the OrderLines to determine product IDs
    const orderLineIds = proposedSplits.map((s) => s.orderLineId);
    const orderLines = await prisma.orderLine.findMany({
      where: { id: { in: orderLineIds } },
    });
    const orderLineMap = new Map<string, string>();
    for (const ol of orderLines) {
      orderLineMap.set(ol.id, ol.productId);
    }

    // 2. Validate proposed split quantities against available stock in backend
    for (const split of proposedSplits) {
      const productId = orderLineMap.get(split.orderLineId);
      if (!productId) {
        throw new Error(`OrderLine '${split.orderLineId}' is invalid.`);
      }

      const stock = await prisma.warehouseStock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: split.warehouseId,
            productId,
          },
        },
        include: { warehouse: true, product: true },
      });

      if (!stock) {
        throw new Error(
          `Warehouse does not stock product '${productId}'.`
        );
      }

      // Account for quantities already reserved by this existing fulfillment
      const alreadyReservedByThisFulfillment = fulfillment.lines
        .filter((l) => l.warehouseId === split.warehouseId && l.orderLineId === split.orderLineId)
        .reduce((sum, l) => sum + l.quantity, 0);

      const usableStock = stock.availableQuantity - (stock.reservedQuantity - alreadyReservedByThisFulfillment);

      if (split.quantity > usableStock) {
        throw new Error(
          `Validation Failed: Insufficient stock at warehouse '${stock.warehouse.name}' for product '${stock.product.name}'. Requested: ${split.quantity}, Usable: ${usableStock}.`
        );
      }
    }

    // 3. Execute override transactionally: release previous reservations, apply new ones, update lines
    await prisma.$transaction(async (tx) => {
      // Revert previous reservations from this fulfillment
      for (const line of fulfillment.lines) {
        const productId = orderLineMap.get(line.orderLineId);
        if (productId) {
          await tx.warehouseStock.update({
            where: {
              warehouseId_productId: {
                warehouseId: line.warehouseId,
                productId,
              },
            },
            data: {
              reservedQuantity: { decrement: line.quantity },
            },
          });
        }
      }

      // Delete existing fulfillment lines
      await tx.fulfillmentLine.deleteMany({
        where: { fulfillmentId },
      });

      // Apply new lines and reserve stock
      const usedWarehouses = new Set<string>();
      let totalShipping = 0;

      for (const split of proposedSplits) {
        const productId = orderLineMap.get(split.orderLineId)!;
        const warehouse = await tx.warehouse.findUnique({ where: { id: split.warehouseId } });
        const shippingCost = warehouse ? decimalToNumber(warehouse.shippingBaseCost) : 10;
        totalShipping += shippingCost;
        usedWarehouses.add(split.warehouseId);

        await tx.fulfillmentLine.create({
          data: {
            fulfillmentId,
            orderLineId: split.orderLineId,
            warehouseId: split.warehouseId,
            quantity: split.quantity,
            shippingCost: toDecimal(shippingCost),
          },
        });

        await tx.warehouseStock.update({
          where: {
            warehouseId_productId: {
              warehouseId: split.warehouseId,
              productId,
            },
          },
          data: {
            reservedQuantity: { increment: split.quantity },
          },
        });
      }

      // Update fulfillment totals
      await tx.fulfillment.update({
        where: { id: fulfillmentId },
        data: {
          shipmentCount: usedWarehouses.size || 1,
          estimatedShippingCost: toDecimal(totalShipping),
          status: "FULFILLED",
        },
      });
    });

    return prisma.fulfillment.findUnique({
      where: { id: fulfillmentId },
      include: {
        lines: {
          include: { warehouse: true },
        },
      },
    });
  },

  // ─── Backorders ─────────────────────────────────────────────────────────────
  async listBackorders(status?: string) {
    return prisma.backorder.findMany({
      where: {
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
