# DealFlow360 — Team Build Prompt

You are helping build **DealFlow360 — An Intelligent, Self-Governing Sales Operations Platform**, a hackathon project built by 3 developers working independently on separate branches, merging into one repository and **one shared database schema**.

I will tell you my role as `MY_ROLE = PERSON_1`, `PERSON_2`, or `PERSON_3`. Read my responsibilities from this document. Do not ask me what the other developers are building unless a genuine dependency appears that is not defined here — in that case, ask.

Authentication (login/signup, JWT, User model) is **already complete**. Do not rebuild it.

---

## 1. TECHNOLOGY

| Layer | Choice |
|---|---|
| Frontend | React / Next.js, TypeScript |
| Backend | Node.js, TypeScript |
| Database | PostgreSQL — **one single database, shared by all three developers** |
| ORM | Prisma (multi-file schema) |
| Auth | JWT (already built) |
| API | REST |

Rules:
- All IDs are UUIDs.
- All money is `Decimal` in Prisma / `NUMERIC` in Postgres. **Never `Float`.**
- All dates are `DateTime` / `timestamptz`.
- Percentages stored as `Decimal` (e.g. `12.50` means 12.5%). Be consistent — never mix `0.125` and `12.5`.

---

## 2. DATABASE STRATEGY (READ THIS FIRST)

**One database. One Prisma schema. Split across multiple files.**

Do NOT create three separate databases and merge them later — that destroys foreign keys, breaks cross-domain transactions, and produces an integration cliff on the final day.

Enable Prisma's multi-file schema (requires Prisma 5.15+):

```
prisma/
  schema/
    base.prisma          # datasource, generator, User, Customer, shared enums — FROZEN after hour 1
    sales.prisma         # PERSON 1 only
    approvals.prisma     # PERSON 2 only
    billing.prisma       # PERSON 3 only
  migrations/
```

```prisma
// prisma/schema/base.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Prisma concatenates every `.prisma` file in the folder at generate time. Cross-file relations work normally. Each developer edits **only their own file**, so the schema never causes a merge conflict.

**Local databases, shared schema.** Every developer runs their own local Postgres instance with the same schema and their own seed data. Nobody shares a live DB during development.

---

## 3. MIGRATION RULES

- Each developer runs `npx prisma migrate dev --name <name>` against **their own local DB only**.
- Migration names are prefixed: `person1_sales_models`, `person2_approval_fulfillment_models`, `person3_billing_models`.
- Migration folders are timestamped, so parallel migrations merge cleanly — **never edit another developer's migration folder**.
- After merging to `main`, everyone pulls and runs `npx prisma migrate deploy` locally.
- **Never run `prisma migrate reset` on anything but your own local database.**
- Never rename or delete another developer's models.
- Never change shared enums (`UserRole`, `QuotationStatus`, `OrderStatus`, `ProductType`, `CustomerTier`) without team agreement.

---

## 4. HOUR ONE — DONE TOGETHER, THEN FROZEN

Before anyone writes feature code, the team writes these together and does not change them unilaterally:

1. `prisma/schema/base.prisma` — `User`, `Customer`, and all shared enums.
2. `backend/common/` — auth middleware, role guard, API response wrapper, Decimal helpers, shared TypeScript types. **Owned by whoever built auth.** Frozen after hour one.
3. `frontend/common/` — layout shell, buttons, cards, form inputs. Frozen after hour one; after that everyone writes page-local styles.
4. `CONTRACTS.md` — the API shapes in sections 8–11 below, copied into the repo.

---

## 5. SHARED USER MODEL (ALREADY BUILT)

```
User: id, name, email, passwordHash, role, createdAt, updatedAt
```

Roles — use these exact values:

```
ADMIN | SALES_REP | SALES_MANAGER | FINANCE | OPERATIONS | CUSTOMER
```

---

## 6. SHARED CUSTOMER CONTRACT

Owned by **PERSON 1**. Persons 2 and 3 may read it; nobody redefines it.

```
Customer: id, companyName, contactName, email, phone,
          customerTier, currency, active, createdAt, updatedAt
```

```
CustomerTier: BRONZE | SILVER | GOLD
```

Persons 2 and 3 may safely assume `customer.id`, `customer.customerTier`, `customer.email`, `customer.companyName`, `customer.currency` exist.

---

## 7. SHARED PRODUCT CONTRACT

Owned by **PERSON 2** (see the ownership rebalance in section 12). Persons 1 and 3 consume it.

```
Product: id, name, description, categoryId, productType, basePrice,
         costPrice, taxRate, minimumMargin, active, createdAt, updatedAt

Category: id, name, description

ProductVariant: id, productId, attributeName, attributeValue, extraPrice
```

```
ProductType: ONE_TIME | SUBSCRIPTION
```

- PERSON 1 uses: `id`, `name`, `basePrice`, `costPrice`, `taxRate`, `minimumMargin`, `productType`, `categoryId`
- PERSON 2 uses: `id`, `categoryId`, `basePrice`, `costPrice`, `minimumMargin`
- PERSON 3 uses: `id`, `productType`, `basePrice`

---

## 8. SHARED QUOTATION CONTRACT

Owned by **PERSON 1**. Persons 2 and 3 must not create an alternative quotation representation.

```
Quotation: id, quotationNumber, customerId, salesRepId, status, currency,
           subtotal, discountAmount, taxAmount, totalAmount, totalCost,
           marginAmount, marginPercentage, riskScore,
           createdAt, updatedAt, lastActivityAt

QuotationLine: id, quotationId, productId, variantId?, quantity, unitPrice,
               costPrice, discountPercentage, discountAmount, taxPercentage,
               taxAmount, lineSubtotal, lineTotal, lineMargin,
               createdAt, updatedAt
```

```
QuotationStatus:
  DRAFT | PENDING_APPROVAL | APPROVED | REJECTED |
  UNDER_NEGOTIATION | CONFIRMED | CANCELLED
```

### CRITICAL: status ownership

`Quotation.status` and `Quotation.riskScore` are written by **PERSON 1 only**.

PERSON 2 never writes to the `Quotation` table. Instead:

- PERSON 2 owns `ApprovalRequest` and returns approval outcomes through its API.
- PERSON 1 calls PERSON 2's evaluation endpoint and writes the resulting status itself.
- PERSON 1 exposes one function, `transitionQuotation(quotationId, event)`, which is the **only** code path that writes `Quotation.status`.

This prevents two modules racing on the same column. Without this rule you will get silent overwrites during the demo.

---

## 9. SHARED ORDER CONTRACT

A quotation becomes an Order only after final confirmation. **PERSON 1** performs the conversion and owns these tables.

```
Order: id, orderNumber, quotationId, customerId, status,
       subtotal, taxAmount, totalAmount, currency, createdAt, updatedAt

OrderLine: id, orderId, productId, quantity, unitPrice, taxAmount,
           totalAmount, productType, subscriptionPlanId?
```

```
OrderStatus:
  CONFIRMED | FULFILLING | PARTIALLY_FULFILLED | FULFILLED |
  BILLING_PENDING | COMPLETED | CANCELLED
```

**`OrderLine.subscriptionPlanId` is a plain nullable `String` with no foreign key constraint.** It points at PERSON 3's `SubscriptionPlan`, but declaring a real FK would force PERSON 1's file to depend on PERSON 3's file compiling. PERSON 3 resolves the reference at read time.

PERSON 2 reads Orders for fulfillment. PERSON 3 reads Orders for billing. Neither creates an alternative Order table.

---

## 10. APPROVAL SERVICE CONTRACT (PERSON 2 → PERSON 1)

```
POST /api/approvals/evaluate/:quotationId
```

Response:

```json
{
  "success": true,
  "data": {
    "quotationId": "...",
    "requiresApproval": true,
    "riskScore": 72.5,
    "level": "FINANCE",
    "status": "PENDING_APPROVAL",
    "reason": "Service line exceeds category ceiling by 8%"
  }
}
```

```
ApprovalLevel:   NONE | MANAGER | FINANCE
ApprovalOutcome: APPROVED | PENDING_APPROVAL | REJECTED | REVISION_REQUIRED
```

PERSON 1 displays the result and sets quotation status accordingly. PERSON 1 never recomputes discount risk locally.

---

## 11. API RESPONSE STANDARD

Success:
```json
{ "success": true, "data": {} }
```

Failure:
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Readable explanation" } }
```

Use correct HTTP status codes. This wrapper lives in `backend/common/` and is written once in hour one.

---

## 12. ROLE DEFINITIONS

Scope has been rebalanced from a naive split: product catalog sits with PERSON 2 (whose discount rules are category-driven anyway, and whose fulfillment work starts late), because PERSON 1 is otherwise overloaded and on everyone's critical path.

### PERSON 1 — Sales, Quotations, Recommendations, Customer Portal

**Backend**
- Customer management (CRUD)
- Quotation creation, editing, deletion
- Quotation line calculations: unit price, discount, tax, subtotal, total
- Cost and margin calculation (line-level and order-level)
- Recommendation / upsell / cross-sell engine
- Customer portal access (restricted, scoped to one customer)
- Customer negotiation requests (comments, quantity change, counter discount)
- Final quotation confirmation
- Quotation → Order conversion
- `transitionQuotation()` state machine

**Frontend**
- Sales workspace shell and top navigation
- Customer list and customer form
- Quotation list + Kanban pipeline view
- Quotation builder (product picker, cart, line editing)
- Live margin indicator
- Recommendation panel (Add to Quote / Dismiss)
- Customer portal: quotation view, line comments, counter discount, confirm

**Owns:** `backend/sales/`, `backend/recommendations/`, `frontend/sales/`, `frontend/portal/`, `prisma/schema/sales.prisma`

**Assumes from PERSON 2:** product catalog, approval evaluation endpoint (section 10)
**Assumes from PERSON 3:** subscription plan list (for attaching `subscriptionPlanId`); PERSON 1 never generates invoices

---

### PERSON 2 — Catalog, Discount Governance, Approvals, Warehouse, Fulfillment

**Backend**
- Product, Category, ProductVariant CRUD
- Price lists (tier-based pricing) — *droppable if short on time*
- Customer-tier discount ceilings
- Category discount ceilings
- Blended risk score engine
- Approval chain configuration
- Manager approval, Finance approval
- Approval audit trail (append-only)
- Approval email notifications — *droppable*
- Warehouse management
- Warehouse stock and reservations
- Fulfillment allocation algorithm
- Manual warehouse override with backend stock validation
- Backorders and backorder consolidation

**Frontend**
- Product list, product create/edit, category management
- Discount tier and category ceiling configuration
- Approval chain configuration
- Approval inbox / approval detail screen with risk breakdown
- Approval action screen (Approve / Reject / Request Revision)
- Warehouse setup and stock levels
- Fulfillment split screen (Accept Suggested Split / Manual Override)
- Backorder view

**Owns:** `backend/catalog/`, `backend/approvals/`, `backend/fulfillment/`, `frontend/catalog/`, `frontend/approvals/`, `frontend/fulfillment/`, `prisma/schema/approvals.prisma`

**Assumes from PERSON 1:** Quotation, QuotationLine, Customer, Order, OrderLine (read-only)
**Assumes from PERSON 3:** nothing. PERSON 2 exposes fulfillment state; PERSON 3 reads it.

**Never writes to the `Quotation` table.**

---

### PERSON 3 — Subscriptions, Billing, Payments, Dashboard

**Backend**
- Subscription plan configuration
- Subscription creation from confirmed Orders
- Subscription lifecycle (activate, pause, cancel, expire)
- AutoPay preference
- Recurring billing schedule generation
- Proration on mid-cycle quantity/plan change
- Cancellation and partial refund
- Credit notes — *droppable*
- One-time invoice generation
- Recurring invoice generation
- Payments (mock gateway acceptable)
- Billing scheduler job
- Dashboard aggregation
- Reports with filters and export

**Frontend**
- Subscription plan configuration screen
- Subscription and billing screen (one-time lines vs recurring lines, separated)
- Upcoming billing schedule view
- Invoice list and invoice detail
- Payment recording screen
- Deal health dashboard (stalled deals, discount anomalies, fulfillment delays)
- Reports with Period / Rep / Approval Status / Product filters, PDF + XLS export

**Owns:** `backend/billing/`, `backend/dashboard/`, `frontend/billing/`, `frontend/dashboard/`, `prisma/schema/billing.prisma`

**Assumes from PERSON 1:** Order, OrderLine, Customer, Quotation (read-only, for analytics)
**Assumes from PERSON 2:** ApprovalRequest status/riskScore, Fulfillment status, Backorder (read-only, for analytics)

**Build order matters:** subscriptions → invoices → payments → **dashboard last**. The dashboard reads all three domains; building it early means rebuilding it three times.

---

## 13. PERSON 2 — BLENDED RISK ENGINE

Configuration must come from the database, never hardcoded.

```
DiscountTier:         id, customerTier, maximumDiscount, active
CategoryDiscountRule: id, categoryId, maximumDiscount, active
ApprovalRule:         id, minimumRiskScore, maximumRiskScore,
                      requiredApprovalLevel, active
```

Algorithm — evaluate **every line** against its own effective limit:

```
allowedDiscount = min(tierCeiling(customer.customerTier),
                      categoryCeiling(product.categoryId))

lineExcess        = max(0, appliedDiscount - allowedDiscount)
lineWeight        = lineTotal / quotationSubtotal
weightedViolation = lineExcess * lineWeight

riskScore = sum(weightedViolation across all lines)
```

Requirements:
- Every line evaluated, not just the worst one.
- Customer tier **and** product category both considered; stricter wins.
- Many small violations must accumulate into meaningful risk.
- Highest required approval level wins across the order.
- Return a per-line breakdown in the response so the approval UI can explain *why*.

Worked example (for testing, not for hardcoding):
Gold customer, tier ceiling 15%. Hardware category ceiling 15%, Service category ceiling 10%.
Laptop at 12% discount → allowed 15% → excess 0.
Setup Service at 18% discount → allowed 10% → excess 8 points.
The Service line alone flags the quotation, despite the customer being Gold.

---

## 14. PERSON 2 — APPROVAL FLOW

```
Quotation submitted
  → calculate blended risk score
  → look up ApprovalRule matching that score
  → return required level to PERSON 1
```

- Level `NONE` → PERSON 1 sets `APPROVED`
- Level `MANAGER` → create `ApprovalRequest` for Sales Manager; PERSON 1 sets `PENDING_APPROVAL`
- Manager approves and Finance also required → create next `ApprovalRequest` for Finance
- Finance approves → PERSON 1 sets `APPROVED`

```
ApprovalRequest: id, quotationId, level, status, assignedRole, createdAt
ApprovalAction:  id, approvalRequestId, actorId, action, reason, timestamp
```

```
ApprovalActionType: APPROVE | REJECT | REQUEST_REVISION
```

**Audit history is append-only. Never delete or update an `ApprovalAction`.**

---

## 15. PERSON 2 — WAREHOUSE MODEL AND ALGORITHM

```
Warehouse:      id, name, latitude, longitude, shippingBaseCost, priority, active
WarehouseStock: id, warehouseId, productId, availableQuantity,
                reservedQuantity, reorderLevel
Fulfillment:    id, orderId, status, estimatedShippingCost, shipmentCount
FulfillmentLine:id, fulfillmentId, orderLineId, warehouseId, quantity, shippingCost
Backorder:      id, orderLineId, quantity, status, createdAt
```

Usable stock = `availableQuantity - reservedQuantity`.

Do not select warehouses on distance alone. Score on stock, distance, shipping cost, and shipment count:

```
warehouseScore = distanceWeight * distance
               + shippingCostWeight * estimatedShippingCost
               + shipmentPenalty
```

Prefer fewer warehouses when two solutions have similar total cost.

Process: read OrderLines → find warehouses stocking each product → compute usable quantity → score → sort → allocate greedily → repeat until satisfied → create Backorder for any remainder → reserve allocated stock → return allocation.

Manual override is allowed but **must be validated against stock on the backend**.

---

## 16. PERSON 3 — SUBSCRIPTIONS AND BILLING

```
SubscriptionPlan: id, name, billingCycle, price, prorationEnabled,
                  cancellationPolicy, refundPolicy, active

Subscription: id, customerId, orderId, orderLineId, productId, planId,
              quantity, status, startDate, currentPeriodStart,
              currentPeriodEnd, nextBillingDate, autoPayEnabled,
              createdAt, updatedAt
```

```
BillingCycle:       MONTHLY | QUARTERLY | YEARLY
SubscriptionStatus: ACTIVE | PAST_DUE | PAUSED | CANCELLED | EXPIRED
```

### Hybrid billing

One Order may contain both `ONE_TIME` and `SUBSCRIPTION` lines. Example: Laptop ₹80,000 one-time, Installation ₹5,000 one-time, Cloud Service ₹1,000/month subscription.

- Generate an **immediate one-time invoice** for Laptop + Installation.
- Create a **Subscription and future billing schedule** for Cloud Service.
- **Never fold future recurring charges into the initial one-time invoice.**

### Invoices and payments

```
Invoice:     id, invoiceNumber, customerId, orderId, subscriptionId?,
             invoiceType, subtotal, taxAmount, totalAmount, dueDate,
             status, createdAt
InvoiceLine: id, invoiceId, description, productId, quantity,
             unitPrice, taxAmount, totalAmount
Payment:     id, invoiceId, customerId, amount, paymentMethod, status,
             transactionReference, paidAt
```

```
InvoiceType:   ONE_TIME | RECURRING | PRORATION | CREDIT
InvoiceStatus: DRAFT | ISSUED | PAID | PARTIALLY_PAID | OVERDUE | CANCELLED
PaymentStatus: PENDING | SUCCESS | FAILED | REFUNDED
```

**Never store raw card data.** AutoPay is a boolean preference on the subscription, not stored credentials. A mock payment gateway is acceptable.

### AutoPay scheduler

For subscriptions where `nextBillingDate <= now` and `status == ACTIVE`:

- `autoPayEnabled == true` → create recurring invoice → attempt payment → on success mark invoice `PAID` and advance `nextBillingDate`; on failure mark `ISSUED`/`OVERDUE` and optionally set subscription `PAST_DUE`.
- `autoPayEnabled == false` → create invoice, mark payment required, collect nothing automatically.

### Proration

```
remainingPeriodFraction = remainingTime / totalBillingPeriod
oldUnusedCredit         = oldPrice * remainingPeriodFraction
newPlanCharge           = newPrice * remainingPeriodFraction
prorationAmount         = newPlanCharge - oldUnusedCredit
```

Positive → create a `PRORATION` invoice. Negative → create a credit note. Never hardcode dates or amounts.

---

## 17. PERSON 3 — DASHBOARD AND ANALYTICS

Aggregate by reading existing module tables. **Do not duplicate operational tables for reporting.**

Metrics: total quotations, confirmed orders, revenue, pending approvals, approved, rejected, stalled quotations, discount anomalies, active subscriptions, overdue invoices, fulfillment delays, backorders.

**Stalled deal rule** (threshold configurable — 3 / 5 / 7 days, not hardcoded):

```
status NOT IN (CONFIRMED, CANCELLED)
AND (now - lastActivityAt) > configuredStalledDays
```

**Discount anomaly** — analytics display only. PERSON 2 owns approval decisions; PERSON 3 only surfaces where a quotation's discount significantly exceeds the rep's historical average or a configured expected level. Do not duplicate PERSON 2's approval logic.

---

## 18. PERSON 1 — RECOMMENDATION ENGINE

Inputs: current quotation products, co-purchase history, promotion flags, expected margin, category relationships.

**Use a weighted sum, not a product.** Multiplication means any single zero factor silently kills the recommendation, so nothing unpromoted would ever surface:

```
recommendationScore = w1 * coPurchaseScore
                    + w2 * promotionScore
                    + w3 * marginScore
```

Only recommend products where `expectedMargin >= product.minimumMargin`.

Response shape:

```json
{
  "productId": "...",
  "productName": "Wireless Mouse",
  "score": 0.88,
  "reason": "Frequently purchased with Laptop",
  "promotion": true,
  "marginDelta": 850
}
```

Adding a recommendation must immediately recalculate quotation totals and margin.

---

## 19. PERSON 1 — CUSTOMER PORTAL AND NEGOTIATION

The portal is a **real, separate, restricted view** — not an internal screen with a different label. Enforce at the API layer: a `CUSTOMER` token may only read quotations belonging to that customer.

Customer may: view quotation and lines, write line-level comments, request quantity change, request product change, propose a counter discount, submit the negotiation, confirm the quotation.

On any change to financial terms:
1. PERSON 1 updates the quotation and sets status `UNDER_NEGOTIATION`.
2. PERSON 1 calls PERSON 2's `/api/approvals/evaluate/:quotationId` again.
3. PERSON 1 applies the returned status via `transitionQuotation()`.

**PERSON 1 never decides locally whether reapproval is needed.**

---

## 20. CROSS-MODULE RULE — NEVER BLOCK

If a dependency is not built yet:

1. Use the contract defined in this document.
2. Create a TypeScript interface for it.
3. Create a mock implementation behind a service abstraction.
4. Create seed data.
5. Finish your module.
6. Swap the mock for the real client later — the UI and business flow must not change.

Example mock for PERSON 1 while PERSON 2 is still building:

```ts
// backend/sales/services/approval.client.ts
export interface ApprovalClient {
  evaluate(quotationId: string): Promise<ApprovalEvaluation>;
}

export const mockApprovalClient: ApprovalClient = {
  async evaluate(quotationId) {
    return {
      quotationId,
      requiresApproval: true,
      riskScore: 65,
      level: "MANAGER",
      status: "PENDING_APPROVAL",
      reason: "Mock response",
    };
  },
};
```

Toggle via env var (`USE_MOCK_APPROVALS=true`) so integration is a config change, not a code change.

PERSON 2 seeds quotations/orders while PERSON 1 builds. PERSON 3 seeds orders while 1 and 2 build.

**Seed data lives in three separate files** — `seed/sales.ts`, `seed/approvals.ts`, `seed/billing.ts` — called by one thin runner. Never one shared `seed.ts`.

Use fixed, agreed UUID constants for shared seed entities (one demo customer, three demo products) so mock data lines up at integration time.

---

## 21. FILE STRUCTURE AND OWNERSHIP

```
prisma/schema/
  base.prisma          SHARED — frozen after hour 1
  sales.prisma         P1
  approvals.prisma     P2
  billing.prisma       P3

backend/
  auth/                DONE — do not modify
  common/              SHARED — frozen after hour 1
  sales/               P1
  recommendations/     P1
  catalog/             P2
  approvals/           P2
  fulfillment/         P2
  billing/             P3
  dashboard/           P3

frontend/
  auth/                DONE
  common/              SHARED — frozen after hour 1
  sales/               P1
  portal/              P1
  catalog/             P2
  approvals/           P2
  fulfillment/         P2
  billing/             P3
  dashboard/           P3
```

Nobody edits a file outside their column. No shared god-controller or god-service.

**Route registration and the workspace nav menu are append-only, one line per person.** Conflicts there are then trivial to resolve.

---

## 22. GIT

Branches:
- PERSON 1: `feature/sales-recommendation`
- PERSON 2: `feature/catalog-approval-fulfillment`
- PERSON 3: `feature/billing-dashboard`

Before merging:
```bash
git checkout main && git pull origin main
git checkout <your-branch> && git merge main
# resolve conflicts in YOUR branch, test, then open a PR
```

Never make large unrelated changes in another developer's folder.

---

## 23. END-TO-END FLOW

```
Admin configures catalog, discount tiers, warehouses, subscription plans
  ↓
Sales rep creates a quotation for a customer
  ↓
Recommendation engine suggests upsell/cross-sell; totals and margin update live
  ↓
Rep applies discounts and submits
  ↓
Approval engine computes blended risk score
  ↓
Manager, then Finance if required, approve
  ↓
Customer negotiates in the restricted portal
  ↓
Changed financial terms re-trigger approval evaluation automatically
  ↓
Customer confirms → quotation converts to Order
  ↓
Warehouse engine allocates fulfillment across warehouses, creates backorders
  ↓
Billing separates one-time and recurring lines
  ↓
One-time invoice issued + subscription billing schedule created
  ↓
Payment / AutoPay
  ↓
Dashboard and reports
```

---

## 24. SCOPE — CUT LIST

If time runs short, these three things are what the problem statement actually cares about and must work:

1. **Blended discount risk score** with real DB-driven tier and category ceilings
2. **Multi-warehouse fulfillment split** with backorders
3. **Hybrid billing** — one-time invoice plus separate recurring schedule on the same order

Droppable, in this order: multi-currency, credit notes, AutoPay retry logic, price lists, product variants, email approval actions, PDF/XLS export.

---

## 25. HOW TO RESPOND WHEN I GIVE YOU MY ROLE

On the **first** message after I state my role, briefly confirm: what I own, what I can assume already exists, and what I need to build. Keep it short.

After that, **do not repeat that preamble on every reply.** Go straight to the work.

Always:
- Implement only my responsibility.
- Use the contracts above rather than asking me to redefine them.
- Provide mock interfaces for anything not yet built.
- Keep code modular and merge-safe — my files only.
- Validate input on the backend, not just the UI.
- Use Decimal for money, UUIDs for IDs, the standard API response wrapper.

If a genuine gap appears that this document does not cover, ask one clear question rather than guessing.
