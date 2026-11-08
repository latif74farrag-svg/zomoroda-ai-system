# Enterprise Architecture Blueprint – Zomoroda ERP / Agentic Commerce

Principle: **modular monolith first**, with a durable job queue and agents as workers. It already fits the codebase (one Express app, one DB, one worker) and gives the stability of a single deployable unit with clear module seams that can be split later.

---

## 1. Data Layer

### 1.1 Today (verified in `lib/migrations.js`, `store_data.js`)
Core: `store_products`, `inventory`, `inventory_history`, `store_orders`, `store_customers`, `staff`, `staff_sessions`, `audit_log`, `jobs`, `agent_tasks`, `agent_controls`, `marketing_campaigns`, `leads`, `affiliates`, `affiliate_sales`, `price_list_items`, `message_templates`, `support_tickets`, `cod_collections`, `product_images` (new).

Weak spots to fix:
| Issue | Why it matters | Fix |
|---|---|---|
| `store_orders` items stored as JSON | Cannot query/report by product, no FK integrity | `order_items` table |
| Prices stored as REAL in `store_products.price` but money handled as integer minor units elsewhere | Rounding drift | Store `price_minor INTEGER` only |
| `store_products.variants` and image URL inline | No variant stock, no gallery | `product_variants`, `product_media` |
| Free-text `category` | Typos, no hierarchy | `categories` table + FK |
| `audit_log` mixes staff, agent, customer events | Hard to query/retain | `activity_events` (see audit-and-roadmap.md) |
| Foreign keys not declared | Orphans possible | Enable `PRAGMA foreign_keys=ON`, declare FKs |

### 1.2 Target schema (normalized, 3NF)
```
categories(id PK, parent_id FK→categories, slug UNIQUE, name_ar, sort_order, is_active)
products(id PK, category_id FK, slug UNIQUE, name, brand_id FK, description,
         status['draft'|'active'|'hidden'|'archived'], created_at, updated_at)
product_variants(id PK, product_id FK, sku UNIQUE, label, unit, units_per_carton,
                 price_minor INT NOT NULL CHECK(>=0), is_active)
product_media(id PK, product_id FK, asset_id FK→assets, position, is_primary)
assets(id PK, kind['image'|'pdf'|'video'], storage['blob'|'db'|'s3'], url, mime,
       bytes, sha256 UNIQUE, created_by FK→staff, created_at)

inventory(variant_id PK/FK, on_hand, reserved, low_stock)  CHECK(reserved<=on_hand)
inventory_movements(id PK, variant_id FK, delta, reason['sale'|'return'|'count'|'damage'|...],
                    ref_type, ref_id, actor_id, created_at)      -- append-only ledger

customers(id PK, name, phone UNIQUE, email, created_at)
addresses(id PK, customer_id FK, line, city, notes)
orders(id PK, number UNIQUE, customer_id FK, status, subtotal_minor, shipping_minor,
       total_minor, payment_method, placed_at, updated_at)
order_items(id PK, order_id FK, variant_id FK, name_snapshot, unit_price_minor, qty,
            line_total_minor)                                    -- snapshot at purchase time
order_status_history(id PK, order_id FK, from_status, to_status, actor_id, at)
payments(id PK, order_id FK, method, amount_minor, reference UNIQUE, at)   -- supersedes cod_collections

staff(id, email UNIQUE, name, role_id FK→roles, disabled)   roles(id, name)   role_permissions(role_id, permission)
leads(id, channel, contact_key UNIQUE, sector, stage, consent, opted_out, last_contact_at)
outreach_log(id, lead_id FK, channel, template_id FK, status, sent_at)       -- enforces the 30-day rule by query
```
Rules: money = integer minor units; timestamps = integer epoch ms (UTC); IDs = UUID/ULID for externally visible entities; every state change that matters has a history table; deletes are soft (`status`, `disabled`).

### 1.3 Integrity & performance
- Transactions for every multi-row write (`storage.transaction`, exists); idempotency keys for POSTs (exists).
- Indexes: `orders(customer_id, placed_at)`, `orders(status, placed_at)`, `inventory_movements(variant_id, created_at)`, `leads(contact_key)`, `outreach_log(lead_id, sent_at)`, `activity_events(ts)`.
- Migrations: versioned, forward-only (`lib/migrations.js`, exists); every migration tested against a copy of production data before deploy.
- Backups: scheduled (`backup.yml`, exists) + monthly restore drill. Turso point-in-time recovery in production.
- Reads: cache catalog (`lib/catalog.js`, exists); heavy reports from read replica or pre-aggregated daily tables.

---

## 2. Content Management

- **Catalog content** (products, categories, banners, offers) is data, edited only through the admin UI, validated server-side (`parseAdminProduct`), versioned via `audit_log` (before/after for important fields).
- **Draft → publish**: `products.status` lets staff prepare changes and publish; scheduled offers via `starts_at/ends_at`.
- **Assets**: single `assets` table; upload pipeline = validate magic bytes + size (exists) → store (Blob, else DB fallback – new) → record sha256 (dedupe) → reference by `asset_id`. Serve with immutable caching; generate WebP/size variants (NEXT, via worker job).
- **Message templates & campaigns**: `message_templates` per sector with approval status; the outreach policy forbids sending a template to a sector it is not approved for (pharmacy → Ronza only, etc.).
- **Localization**: Arabic primary (RTL); keep display strings in one dictionary per page area to allow later English.

---

## 3. Business Logic

Business rules live in **domain modules**, not in routes or UI:
| Module | Owns | Key invariants |
|---|---|---|
| Catalog | products, prices, media | price ≥ 0; sector price lists isolated |
| Inventory | stock ledger | `reserved ≤ on_hand`; reservations expire after 24 h; every change has a movement row |
| Orders | order lifecycle | allowed transitions only: pending→confirmed→shipped→delivered; cancel/return restore stock |
| Payments/COD | collections | amount must equal delivered order total; reference unique |
| Outreach | leads, templates, sending | 30-day gap, 9 am–6 pm, 5-message rest, opt-out is permanent, sector catalog isolation |
| Affiliates | tree & commissions | supervisor promotion at 5 reps; commission computed in integer minor units |
| Agents | proposals, approvals | customer/money actions need human approval; kill switch per agent |

Workflow example (order): `order.created` → reserve stock → job `notify-staff` → staff confirms → `shipped` → `delivered` → COD collection → commission job for affiliate. Each step is an event; each event is idempotent and logged.

State machines are defined as data tables (`transitions = {from: [to,...]}`) shared by API, UI and tests.

---

## 4. System Design

**Pattern: modular monolith + worker + queue.**
```
Browser/Admin UI ─► Express API (modules: catalog, orders, inventory, outreach, agents, auth)
                         │  transactions
                         ▼
                  Turso/libSQL  ◄── jobs table (queue) ◄── Worker (agents, reservations, backups, rollups)
                         ▲                                  │
                         └── activity_events ◄──────────────┘  (+ WhatsApp sender, scraper, email via adapters)
```
- **Why not microservices now**: one team, one DB, strong transactional needs (stock + orders). Split only when a module has independent scaling or deployment needs (candidate order: outreach/WhatsApp, then media processing).
- **Seams**: each module exposes functions, not tables, to others; cross-module calls go through the job queue or a service function – so extraction later is mechanical.
- **Reliability**: health endpoints (`/health/live`, add `/health/ready` with DB check), retries + dead-letter queue (exists), circuit breaker around WhatsApp/email/LLM calls, graceful shutdown in the worker (exists).
- **Scalability**: stateless web processes (sessions in DB) behind the platform load balancer; worker count scales via job leasing (`lease_until`, exists); cache + CDN for public store pages.
- **Security**: role-based permissions (exists), CSRF (exists), rate limits (exists), email-code or TOTP login, secrets only in env, redaction of personal data in logs, least-privilege agent tokens.
- **Observability**: structured JSON logs, metrics (queue depth, job age, error rate, send rate), alerting, the live activity page (new).
- **Delivery**: CI runs lint, tests, migration dry-run; deploy previews; feature flags for new agents; rollback = redeploy previous build (migrations forward-compatible).

---

## 5. UX / UI Principles

1. **Task-first navigation**: top-level sections = jobs people do (Home, Campaigns, Customers, Agents, Activity, Store & Inventory, Users). Max 8 items; one shared shell.
2. **Readable by default**: no IDs, JSON or system codes in the UI. Every log line is a sentence ("أحمد أوقف جميع الوكلاء").
3. **Every screen answers three questions**: what's the state, what needs me, what can I do next. Home shows KPIs → "needs attention" → recent activity.
4. **States are designed**: loading, empty (with the next step), error (with recovery), success (confirmation with what changed).
5. **Forms**: group related fields, inline validation in plain Arabic, destructive actions confirmed and reversible where possible, no silent failures (the image bug came from one).
6. **Visual system**: tokens for color/spacing/radius/type; emerald primary, amber warning, red danger; status = color **plus** text/icon; 4.5:1 contrast; focus rings; touch targets ≥ 44 px.
7. **Responsive & RTL**: mobile-first grids, tables collapse into cards, logical CSS properties (`margin-inline`), numerals consistent.
8. **Trust & control for agents**: show what each agent did, what it proposes, a one-click pause, and approval before anything customer-facing.
9. **Performance**: < 2 s first meaningful paint on mobile, lazy-loaded images, no blocking third-party scripts.
10. **Accessibility**: semantic HTML, labels on all inputs, `aria-live` for notices, keyboard operable.

---

## Implementation order
1. Fix correctness first: money as integer, FKs on, `order_items`, `inventory_movements` (data integrity).
2. `assets` + `product_media` (builds on the image fix).
3. `categories` + variants.
4. Activity events + alerts.
5. Move legacy agents onto the shared DB.
6. UI migration to the shared design system, page by page.
