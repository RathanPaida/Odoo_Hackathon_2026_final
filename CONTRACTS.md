# DealFlow360 — Team API & Data Contracts

## 1. SHARED USER MODEL
```
User: id, name, email, passwordHash, role, approvalLimitPct, createdAt, updatedAt
Roles: ADMIN | SALES_REP | SALES_MANAGER | FINANCE | OPERATIONS | CUSTOMER
```

## 2. SHARED CUSTOMER CONTRACT (Owned by PERSON 1)
```
Customer: id, companyName, contactName, email, phone, customerTier, currency, active, createdAt, updatedAt
CustomerTier: BRONZE | SILVER | GOLD
```

## 3. SHARED PRODUCT CONTRACT (Owned by PERSON 2)
```
Category: id, name, description
Product: id, name, description, categoryId, productType, basePrice, costPrice, taxRate, minimumMargin, active, createdAt, updatedAt
ProductVariant: id, productId, attributeName, attributeValue, extraPrice
ProductType: ONE_TIME | SUBSCRIPTION
```

## 4. SHARED QUOTATION CONTRACT (Owned by PERSON 1)
```
Quotation: id, quotationNumber, customerId, salesRepId, status, currency,
           subtotal, discountAmount, taxAmount, totalAmount, totalCost,
           marginAmount, marginPercentage, riskScore,
           createdAt, updatedAt, lastActivityAt

QuotationLine: id, quotationId, productId, variantId?, quantity, unitPrice,
               costPrice, discountPercentage, discountAmount, taxPercentage,
               taxAmount, lineSubtotal, lineTotal, lineMargin,
               createdAt, updatedAt

QuotationStatus: DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | UNDER_NEGOTIATION | CONFIRMED | CANCELLED
```

## 5. SHARED ORDER CONTRACT (Owned by PERSON 1)
```
Order: id, orderNumber, quotationId, customerId, status,
       subtotal, taxAmount, totalAmount, currency, createdAt, updatedAt

OrderLine: id, orderId, productId, quantity, unitPrice, taxAmount,
           totalAmount, productType, subscriptionPlanId?

OrderStatus: CONFIRMED | FULFILLING | PARTIALLY_FULFILLED | FULFILLED | BILLING_PENDING | COMPLETED | CANCELLED
```

## 6. APPROVAL SERVICE CONTRACT (PERSON 2 → PERSON 1)
```
POST /api/approvals/evaluate/:quotationId

Response:
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

ApprovalLevel:   NONE | MANAGER | FINANCE
ApprovalOutcome: APPROVED | PENDING_APPROVAL | REJECTED | REVISION_REQUIRED
ApprovalActionType: APPROVE | REJECT | REQUEST_REVISION
```

## 7. WAREHOUSE & FULFILLMENT CONTRACT (Owned by PERSON 2)
```
Warehouse: id, name, latitude, longitude, shippingBaseCost, priority, active
WarehouseStock: id, warehouseId, productId, availableQuantity, reservedQuantity, reorderLevel
Fulfillment: id, orderId, status, estimatedShippingCost, shipmentCount
FulfillmentLine: id, fulfillmentId, orderLineId, warehouseId, quantity, shippingCost
Backorder: id, orderLineId, quantity, status, createdAt
```

## 8. API RESPONSE STANDARD
```json
Success:
{ "success": true, "data": {} }

Failure:
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Readable explanation" } }
```
