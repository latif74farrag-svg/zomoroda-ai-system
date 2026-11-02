# Commerce API contracts

All write bodies are JSON unless an image upload explicitly uses multipart. Production uses HTTPS and the configured `BASE_URL` origin. Error responses are `{ "success": false, "error": "..." }`: 400 validation, 401 authentication, 403 permission/CSRF, 404 missing resource, 409 state/stock/idempotency conflict, 429 rate limit and 503 dependency/configuration unavailable. Successful mutation responses have `success: true`. Customer/staff/order responses must never be cached.

## Public retail and customer interfaces

| Method | Path | Contract |
| --- | --- | --- |
| GET | `/health/live` | Process liveness; no secrets or business data. |
| GET | `/health/ready` | Schema/database readiness, shipping configuration, and production identity/origin configuration. Does not establish worker or provider health. |
| GET | `/api/v1/products?category=all` | Active retail catalog, categories, integer `price_minor`, legacy decimal `price`, and `available_stock`. Category must be a known catalog category. Public responses without cookies may use a ten-second CDN TTL. |
| GET | `/api/v1/products/:id` | One active retail product or 404. |
| POST | `/api/v1/carts/quote` | `{items:[{id,qty,variant?}]}`; returns `quote: {items,subtotal_minor,shipping_minor,total_minor,currency:"EGP"}`. Stock is checked but not reserved. |
| POST | `/api/v1/orders` | Requires a 16–128 character `Idempotency-Key` of letters/digits/underscore/hyphen. Body: `customer_name`, Egyptian mobile `customer_phone`, `customer_address`, optional `notes`, `items`, optional `payment_method:"cash"`, optional `expected_total_minor`. The browser always sends the quote total. Authenticated phone/customer ID come from the session. 201 for creation, 200 for identical replay; returns `orderNumber,total,replayed`. |
| POST | `/api/v1/orders/track` | `{phone,order_number}`. Both must match; no address/name/other customer data returned. The old GET phone lookup is disabled. |
| GET | `/api/v1/customer/session` | Current customer or unauthenticated result. |
| POST | `/api/v1/customer/register` | `{name,phone,password}`; existing compatible eight-character minimum remains; recovery resets require twelve. Creates a customer session. Phone ownership is not verified by an SMS provider. |
| POST | `/api/v1/customer/login` | `{phone,password}`; session cookie is HttpOnly, SameSite=Strict and Secure in production. |
| POST | `/api/v1/customer/logout` | Invalidates all customer sessions. |
| GET | `/api/v1/customer/orders` | Only orders created with the authenticated customer ID; phone matching does not attach historical guest orders. |
| POST | `/api/v1/customer/password-reset` | `{token,password}`; single-use staff-issued token, expiry 15 minutes; invalidates existing sessions. |
| POST | `/api/v1/support/tickets` | `{message}` of 3–2000 characters; returns `ticketId`. Staff handle the ticket manually even if agents are paused. |

Existing `/api/store/products`, `/api/store/orders`, `/api/store/customer/*` clients share the same handlers. Quantities are positive integers, capped at 99 per product and 50 input lines. Exact known variant strings are required when the product has variants; variants share product-level stock. Money is EGP piastres internally; legacy decimal fields remain for current views. No discount, tax or carrier fee is inferred. The configured delivery fee must already reflect the approved retail delivery policy.

## Staff interfaces and roles

Sign in at `/store/admin` using an individual employee email, password and six-digit TOTP. The old shared-password cookie grants no access. Staff sessions expire after eight hours or logout/disable. Obtain `csrf` from login or session and send it as `X-CSRF-Token` on every staff mutation. API responses expose only the current employee's public session fields. Bootstrap account creation is an operator CLI action.

| Method | Path | Role and behavior |
| --- | --- | --- |
| GET/POST | `/api/v1/admin/session`, `/api/v1/admin/login` | Session lookup or `{email,password,code}` login. |
| POST | `/api/v1/admin/logout` | Any authenticated staff role, with CSRF; revokes this session. |
| GET/POST | `/api/v1/admin/products` | Admin catalog list/create. Existing product form schema applies. |
| PUT | `/api/v1/admin/products/:id` | Admin catalog update; audited. |
| PATCH | `/api/v1/admin/products/:id/visibility` | Admin `{active:boolean}`; preserves historical snapshots. |
| POST | `/api/v1/admin/images` | Admin multipart `image`, maximum 4 MiB, verified JPEG/PNG/WebP signature, stored in Blob. |
| GET | `/api/v1/admin/orders?status=all` | Admin/operations; latest 100 orders including fulfillment data. |
| PATCH | `/api/v1/admin/orders/:number` | Admin/operations `{status}`; enforces lifecycle and stock invariants. Repeating current status is a no-op. |
| GET | `/api/v1/admin/inventory` | Admin/operations stock and reservations. |
| POST | `/api/v1/admin/inventory/:id/adjustments` | Admin/operations `{delta,reason}` with `Idempotency-Key`; integer adjustment must not reduce stock below reserved. |
| POST | `/api/v1/admin/orders/:number/collection` | Admin/operations `{amount_minor,reference}`; delivered order and exact total required. One collection per order and unique reference; replay with same values is a no-op. |
| GET/PATCH | `/api/v1/admin/support`, `/api/v1/admin/support/:id` | Admin/support ticket list; `{status:"open"\|"resolved"}`. |
| POST | `/api/v1/admin/customer-recovery` | Admin/support `{phone,verified:true,verification}` after identity verification. Returns a sensitive token for verified delivery, never log it. |
| GET | `/api/v1/admin/agents` | Admin controls and latest 100 proposals. |
| PATCH | `/api/v1/admin/agents/:agent` | Admin `{paused:boolean}` for `global`, `inventory`, `orders`, `support`; global pause starts enabled. |
| POST | `/api/v1/admin/agent-tasks/:id/review` | Admin `{decision:"approved"\|"rejected"}`; one decision per proposal. Approval queues the allowlisted action. |
| GET | `/api/v1/admin/operations`, `/api/v1/admin/jobs`, `/api/v1/admin/audit` | Admin metrics/heartbeat, failed or waiting jobs, and audit entries. |
| POST | `/api/v1/admin/jobs/:id/retry` | Admin; reset a dead-letter job only, audited. |
| GET/POST | `/api/v1/admin/marketing/campaigns` | Admin; list or save sector-validated campaign drafts. Only approved channel/product combinations are accepted. |
| PATCH | `/api/v1/admin/marketing/campaigns/:id` | Admin; edit drafts or move draft → ready → archived (ready campaigns may return to draft). Ready means staff-reviewed and does not send. |
| POST | `/api/v1/admin/marketing/proposals` | Admin; ask the rule-based marketing agent for a campaign starter proposal. Staff approval atomically saves it as a draft. |

`/review` redirects to the authenticated manager overview at `/store/manager`. `/store/manager` and `/store/operations` provide staff workflows for stock, fulfillment, collections, support, agent supervision and approvals. `/store/marketing` provides the campaign workspace. Marketing campaigns are planning records only; there is no outbound messaging adapter. `/api/store/admin/*` remains compatible with the existing administration UI and enforces the same role/CSRF checks. These are small-store bounded lists, not general reporting/export APIs; add pagination before catalog/operations volumes exceed these bounds.

## Order states, event delivery and integrations

```text
pending -> confirmed | cancelled
confirmed -> shipped | cancelled
shipped -> delivered | delivery_failed
delivery_failed -> shipped | returned
delivered -> returned
returned / cancelled -> terminal
```

Pending orders expire and cancel after 24 hours when the worker runs. Confirmation clears expiry. Shipping consumes reserved stock; cancellation releases it. A return restocks exactly once and must mean staff physically received the goods. Cash collection is a separate reconciliation record, not an automatic payment. Financial refunds are not automated.

Jobs are delivered at least once. Domain transitions, proposal source IDs and stock receipts provide idempotency; lease tokens prevent stale acknowledgements. Dead-letter jobs require staff review. The initial event types are `order.created`, `order.status`, `inventory.changed`, `support.created` and `agent.execute`. Event payloads contain IDs, not customer contact data. No provider webhook or outbound message adapter is enabled, so unexpected provider events cannot change order/payment state. Any future adapter must add signature verification, event deduplication, explicit supported state transitions and provider-specific tests before registration.
