// src/lib/services/fulfillment.service.ts
// Fulfillment service — warehouse allocation using generated Prisma client types.
import { prisma } from "@/lib/db";
import { Prisma, AllocationStatus } from "@/generated/prisma";

export interface StockAdjustmentInput {
  warehouseId: string;
  productId: string;
  qtyOnHand: number;
}

export const fulfillmentService = {
  // ─── Warehouse Management ──────────────────────────────────────────────────
  async listWarehouses() {
    return prisma.warehouse.findMany({
      include: {
        stockItems: {
          include: { product: true },
        },
        _count: { select: { stockItems: true, allocations: true } },
      },
      orderBy: { name: "asc" },
    });
  },

  async createWarehouse(input: { code: string; name: string; region: string }) {
    return prisma.warehouse.create({
      data: {
        code: input.code,
        name: input.name,
        region: input.region,
      },
    });
  },

  // ─── Stock Management ──────────────────────────────────────────────────────
  async listStocks(filters?: { warehouseId?: string; productId?: string }) {
    return prisma.stock.findMany({
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
    const existing = await prisma.stock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: input.warehouseId,
          productId: input.productId,
        },
      },
    });

    if (existing) {
      return prisma.stock.update({
        where: { id: existing.id },
        data: {
          qtyOnHand: input.qtyOnHand,
        },
        include: { warehouse: true, product: true },
      });
    }

    return prisma.stock.create({
      data: {
        warehouseId: input.warehouseId,
        productId: input.productId,
        qtyOnHand: input.qtyOnHand,
      },
      include: { warehouse: true, product: true },
    });
  },

  // ─── Allocation Algorithm (Section 6.3) ──────────────────────────────────
  /**
   * Allocate stock for quote lines using the concurrency-safe approach.
   * Uses SELECT ... FOR UPDATE to prevent double-allocation.
   * Greedily consumes from largest stock first.
   */
  async allocateQuote(quoteId: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        lines: {
          include: { product: true },
        },
      },
    });

    if (!quote) {
      throw new Error(`Quote '${quoteId}' not found.`);
    }

    const allAllocations: Array<{
      quoteLineId: string;
      warehouseId: string | null;
      qty: number;
      status: AllocationStatus;
    }> = [];

    // Process each line in a serializable transaction
    for (const line of quote.lines) {
      await prisma.$transaction(async (tx) => {
        // Lock stock rows for this product
        const rows: Array<{ id: string; warehouseId: string; qtyOnHand: number }> = await tx.$queryRaw`
          SELECT id, "warehouseId", "qtyOnHand"
          FROM "Stock"
          WHERE "productId" = ${line.productId} AND "qtyOnHand" > 0
          ORDER BY "qtyOnHand" DESC
          FOR UPDATE
        `;

        let remainingQty = line.qty;

        // Greedily consume from largest stock first
        for (const row of rows) {
          if (remainingQty <= 0) break;

          const allocQty = Math.min(remainingQty, row.qtyOnHand);
          if (allocQty > 0) {
            // Create RESERVED allocation
            await tx.allocation.create({
              data: {
                quoteLineId: line.id,
                warehouseId: row.warehouseId,
                qty: allocQty,
                status: "RESERVED",
              },
            });

            // Decrement stock
            await tx.stock.update({
              where: { id: row.id },
              data: {
                qtyOnHand: { decrement: allocQty },
                version: { increment: 1 },
              },
            });

            allAllocations.push({
              quoteLineId: line.id,
              warehouseId: row.warehouseId,
              qty: allocQty,
              status: "RESERVED",
            });

            remainingQty -= allocQty;
          }
        }

        // If remaining, create a BACKORDERED allocation (no warehouse)
        if (remainingQty > 0) {
          await tx.allocation.create({
            data: {
              quoteLineId: line.id,
              warehouseId: null,
              qty: remainingQty,
              status: "BACKORDERED",
            },
          });

          allAllocations.push({
            quoteLineId: line.id,
            warehouseId: null,
            qty: remainingQty,
            status: "BACKORDERED",
          });
        }
      }, { isolationLevel: "Serializable" });
    }

    const hasBackorders = allAllocations.some((a) => a.status === "BACKORDERED");

    return {
      quoteId,
      allocations: allAllocations,
      hasBackorders,
    };
  },

  // ─── List Allocations ────────────────────────────────────────────────────
  async listAllocations(quoteLineId?: string) {
    return prisma.allocation.findMany({
      where: {
        ...(quoteLineId ? { quoteLineId } : {}),
      },
      include: {
        quoteLine: { include: { product: true } },
        warehouse: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
