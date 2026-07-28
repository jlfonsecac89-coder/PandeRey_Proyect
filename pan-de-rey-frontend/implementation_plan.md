# Fix Admin Dashboard Rendering Errors

The dashboard rendering errors and crashes (including `substring` of undefined and data mismatch issues) are primarily caused by a mismatch between the casing of fields returned by the PostgreSQL database via the API routes (PascalCase) and the fields expected by the frontend components (camelCase).

## User Review Required
No critical breaking changes to business logic. The fixes are defensive programming and data mapping to ensure the UI handles API data correctly.

## Proposed Changes

### Dashboard Home Component
#### [MODIFY] src/app/admin/page.tsx
- In `fetchDashboardData()`, update the mapping of `/api/orders/analytics` response to map `TotalRevenue` to `ventas`, `TotalOrders` to `pedidos`, etc.
- Update the mapping of `/api/orders` to handle `o.Id`, `o.TotalAmount`, `o.ShippingMethod`, and `o.Status`.
- Add optional chaining (`?.`) to `o.id?.substring(0, 8)` and `o.status?.toLowerCase()`.
- Add nullish coalescing operators to fallback values for `kpiData` fields so they don't break `formatPrice()`.
- Ensure `mainData` and `materialData` fallback to empty arrays to prevent mapping errors.

### Orders Page Component
#### [MODIFY] src/app/admin/orders/page.tsx
- In `fetchOrders()`, map the incoming PascalCase API response to the `Order` type expected by the component.
- Map fields like `Id -> id`, `TotalAmount -> total`, `Status -> status`, `ShippingMethod -> shippingMethod`, `CreatedAt -> createdAt`, `CustomerName -> (FirstName + LastName)`.
- Map `items` array properly from PascalCase (`Quantity`, `ProductName`, `VariantName`) to camelCase.
- Add defensive checks: `order?.id?.substring()`, `order.status?.toLowerCase()`, `it.split?.('x ')`.

### API Route
#### [MODIFY] src/app/api/[[...path]]/route.ts
- In `GET /api/orders/analytics`, ensure we don't return `undefined` values for KPIs by using `COALESCE` in SQL or providing `0` as fallback in the JSON response.
- In `GET /api/orders`, there are no date parsing issues, but we must ensure we return clean JSON.

## Verification Plan
1. Start the development server (`npm run dev`).
2. Visit `/admin` and verify the Dashboard loads without crashes, charts render, and KPI metrics show actual values instead of `NaN`.
3. Visit `/admin/orders` and verify the Orders table and Kanban board render correctly without `substring` errors.
