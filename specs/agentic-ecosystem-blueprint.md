# Agentic Ecosystem Blueprint: 20 agents, 6 departments

Status: Phase 1 foundation is implemented (Guardian #20, Data Refinement #2, Order Aggregator #13, base class, migration v8, tests). Everything else below is design.

## 0. Decisions and constraints

| Decision | Choice | Why |
| :--- | :--- | :--- |
| Stack | Extend the existing Node 22 + Express + Turso/libSQL modular monolith. No Python/FastAPI/Celery/Postgres/Redis for now. | The durable queue, approval flow, kill switches, outreach policy and order state machine already exist and are tested. A rewrite would re-implement them. See [`enterprise-architecture-blueprint.md`](./enterprise-architecture-blueprint.md) section 4. |
| Cost | **Zero paid services until the business is profitable.** | Owner decision, 2026-11-05. |
| Agent logic | Deterministic rules and tools first. An LLM may only draft text, never produce numbers, prices or contacts. | Data integrity. `AI_ENABLED=false` stays the default. |
| Authority | Agents propose; staff approve; the Guardian checks both steps. | HITL plus compliance. |

Cost rules that follow from this: every paid integration is **off by default behind an env flag** and has a free substitute (file upload, manual entry). Phases below carry a cost column for that reason.

When to split a module out of the monolith (not now): independent scaling or deployment needs. Candidate order: outreach/WhatsApp sender, then media/OCR processing. Seams already exist because modules call each other through functions and the `jobs` queue.

## 1. Architecture mapped to this repo

```
Staff UI / API (Express: lib/operations-api.js)
        |  transactions                      Free-tier Turso/libSQL = single source of truth
        v
   Turso/libSQL  <--- jobs (queue, leases, retries, dead letters) <--- worker.js
        ^                                                               |
        |        lib/agentic/registry.js  (Orchestrator: routes only)   |
        |            |-- data-refinement.js   (#2)                      |
        |            |-- order-aggregator.js  (#13)                     |
        |            '-- guardian.js          (#20, gate for all)       |
        '-- agent_tasks (proposals) + audit_log + guardian_decisions <---'
```

| Brief asks for | Here |
| :--- | :--- |
| Postgres/Supabase as single source of truth | Turso/libSQL (SQLite dialect), same transactional guarantees at our scale. `sql.js` locally. |
| Redis/Celery task queue | `jobs` table with leases, backoff, dead letters (`lib/queue.js`), consumed by `worker.js`. |
| FastAPI layer | Express routes under `/api/v1/admin/*` with staff sessions, MFA, CSRF, role permissions. |
| Orchestrator without money/messaging authority | `lib/agentic/registry.js` only routes job types and agent names. It has no send or payment code. Side effects exist only inside approved tools. |

### 1.1 Orchestrator rules
1. `coordinate()` (`lib/agents.js`) asks the registry first (`handles(jobType)`); legacy agents keep their existing branches.
2. A paused agent throws `503 Agent paused`; the queue keeps the job without consuming retries.
3. Errors are logged by the agent (`agent.error`, redacted) and rethrown so the queue retries; after 5 attempts a job becomes a dead letter.
4. An approved task runs as an `agent.execute` job inside one transaction: second Guardian review, tool, completion mark. Any failure rolls all of it back together.
5. Business failures (for example no stock) use a savepoint: the tool records the rejection and the task becomes `rejected` instead of retrying forever.

### 1.2 LLM abstraction (design; not built because it would cost money)
Single provider interface, selected by environment:
```
LLM_PROVIDER=openai|gemini|anthropic     LLM_MODEL=...     LLM_API_KEY=...
AI_ENABLED=false   AI_DAILY_CALL_LIMIT=0   AI_ALLOW_CUSTOMER_TEXT=false
provider.draft({ instructions, input, schema }) -> parsed JSON (strict schema, no tools, store:false)
```
`lib/model.js` becomes the OpenAI adapter; Gemini and Anthropic get sibling adapters. The existing controls stay: daily call budget, redaction of phones/emails/links, strict output schema, staff review of every draft. Swapping models means changing env vars only. Until profit, the rules-based fallbacks run.

### 1.3 Integration layer and unified OMS
All channels feed one table, `channel_orders`, and one OMS, `store_orders`.

```
adapter -> flat order shape -> channel-adapter.validateOrder -> channel_orders (idempotent by channel+external_id)
        -> Order Aggregator plan -> proposal -> approval -> commerce.placeOrder -> store_orders (+ stock reservation)
```
Flat shape: `{ external_id, customer_name, customer_phone, customer_address, payment: cod|prepaid, placed_at, lines: [{ sku, qty, unit_minor | unit_price }] }`.

| Integration | Status | Cost | Free path now |
| :--- | :--- | :--- | :--- |
| Staff file upload (JSON/CSV) for Noon, Amazon, anything | **Built** (`lib/integrations/file-channel.js`) | Free | This is the default path. |
| Shopify Admin API | **Built** (`lib/integrations/shopify.js`), off unless `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_ADMIN_TOKEN` | Free to read an existing store | Only if a store exists. |
| Amazon SP-API | Deferred | Paid developer/seller requirements | CSV export from Seller Central. |
| Noon | Deferred | Partner integration | CSV export from the Noon portal. |
| Google Places (lead discovery) | Deferred | Paid per request | Existing scraper exports and Excel imports. |
| Bosta / Aramex (shipping status) | Deferred | Contract/API access | Staff enter status; same state machine. |

SKU translation: `channel_sku_map(channel, external_sku) -> product_id, variant`. Unmapped SKUs park the order as `needs_mapping`; mapping a SKU re-queues every waiting order.

## 2. The 20 agents in 6 departments

Numbering is a working draft, fixed only for #2, #13 and #20. "Tool" means a deterministic function, API or file source; no agent invents data.

| # | Agent | Dept | Tools / data source | HITL checkpoint (staff approve before it happens) | Guardian checks | Cost | Phase |
| :-- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Lead Discovery | Growth | Excel/scraper exports now; Google Places later | Import batch into `leads` | DNC on import, dedupe by `contact_key` | Free now; Places paid later | 4 |
| **2** | **Data Refinement** | Growth | `leads`, `classifySector`, `normalizeContact`, `do_not_contact` | Apply a batch of fixes | `apply_fixes` daily limit | Free | **1 (built)** |
| 3 | Segmentation | Growth | `leads` stage and sector, `leadSummary` | Campaign target list | 30-day rule, consent | Free | 2 |
| 4 | Content / Ads | Growth | `message_templates`, `ads` drafts | Publish or send | Catalog isolation, no wholesale prices to retail audiences | Free (rules) | 2 |
| 5 | Inbound Responder | Sales | `sales.handleMessage`, price lists | Every outbound reply | Price accuracy, sector list | Free (rules) | 2 |
| 6 | Quote Builder | Sales | `price_list_items`, `buildInvoice` | Quote sent to customer | Price accuracy vs sector list | Free | 2 |
| 7 | Follow-up | Sales | `leads.stage`, `last_contact_at` | Each follow-up message | 30-day, hours, rest interval, DNC | Free | 2 |
| 8 | Affiliate / Moms | Sales | `affiliates`, `affiliate_sales` | Commission credit, promotion | Retail prices only for moms | Free | 3 |
| 9 | Tender Scanner | Tenders | Manual tender inbox; portals later | Shortlist to pursue | None needed (read-only) | Free now | 4 |
| 10 | Tender Compliance / OCR | Tenders | PDF text extraction (local library) | Compliance verdict | Checklist completeness | Free if local OCR | 4 |
| 11 | Bid Preparer | Tenders | Price lists, tender requirements | Bid submission | Price accuracy, margin floor | Free | 4 |
| 12 | Catalog Sync | Channels | `store_products` to channel exports | Price/stock push | Price accuracy | Free (files) | 3 |
| **13** | **Order Aggregator** | Channels | `channel_orders`, `channel_sku_map`, `commerce.placeOrder` | Order import | Price accuracy, `import_order` daily limit, global pause | Free | **1 (built)** |
| 14 | Inventory Sync | Channels | `inventory`, `inventory_history` | Stock push to channels | Never exceed `on_hand - reserved` | Free (files) | 3 |
| 15 | Fulfillment | Operations | `store_orders` state machine | Confirm and ship | Allowed transitions only | Free | 2 |
| 16 | Shipping Tracker | Operations | Staff entry; carrier API later | Status changes | Allowed transitions | Free now | 2 |
| 17 | Replenishment / Forecast | Operations | `inventory_history` sales rate | Purchase suggestion (never a purchase) | None needed (advice only) | Free | 4 |
| 18 | COD Collection | Finance | `cod_collections` | Record collection | Amount equals delivered total | Free | 2 |
| 19 | Commission Ledger | Finance | `affiliate_sales` | Payout | Approved rates only (not yet specified) | Free | 3 |
| **20** | **Guardian** | Finance/Compliance | `do_not_contact`, `guardian_*`, `outreachDecision`, price tables | n/a (it is the gate) | n/a | Free | **1 (built)** |

### 2.1 Human-in-the-loop matrix
Always needs approval: any outbound message, quote, tender bid, order import, price change, refund, payout, purchase. Runs without approval: read-only analysis, drafts that are only saved, queue maintenance. The existing rule stands: no tool for purchasing, refunds, sending messages or changing prices exists in agent code today.

## 3. The Guardian protocol (Agent #20)

`lib/agentic/guardian.js` exports `review(db, { agent, action, subject, payload, phase, now })` and returns `{ verdict: pass | warn | block, reasons[] }`. Every decision is written to `guardian_decisions`; verdicts other than `pass` are visible through `GET /api/v1/admin/guardian/decisions`, and the verdict is stored in the proposal's evidence so staff see it beside the approve button.

Two checkpoints, same rules:
1. **Propose** (read-only counters): a `block` drops the proposal; `warn` shows reasons to staff.
2. **Execute** (inside the approval transaction): re-checks everything because time and data have moved on, and is the only phase that **consumes** budget.

| Rule | Behavior |
| :--- | :--- |
| Unknown action | Block. Actions must be registered in `KNOWN_ACTIONS`. Fail closed. |
| Global pause | At execute, block if the `global` control is paused or missing. |
| Do Not Contact | For `outreach_*`: block if the normalized contact is in `do_not_contact` or its lead is `opted_out`. `setOptOut` copies every opt-out into the permanent list. Order imports are not blocked, since an opt-out concerns marketing, not purchases. |
| Outreach policy | Delegates to `outreachDecision`: consent, 30-day gap, 9:00-18:00 Cairo, Friday closure, sector catalog isolation, 5-message batch break, 10-minute spacing. The first failing rule is the reason. |
| Daily limits | `guardian_limits(agent, action)` with `*` as the fallback agent. Reserved atomically per Cairo day: `INSERT ... ON CONFLICT DO UPDATE ... WHERE count < limit`. At propose time it only warns. Defaults: `import_order` 200, `apply_fixes` 20, WhatsApp outreach 30, email outreach 100. |
| Price accuracy | Product lines are compared with `store_products.price`; sector lines with that sector's own list in `price_list_items`. Mismatch is `warn` with expected and actual values; unknown product is `block`. |
| Catalog isolation | A line naming a price list other than the audience sector's list is `block` (for example wholesale prices to moms). |

Not built yet: a Guardian that watches WhatsApp account health signals. That needs a sending adapter first, which does not exist by design.

## 4. Priority agents: implementation notes

### 4.1 Guardian: see section 3.

### 4.2 Data Refinement (#2)
- Trigger: hourly worker tick (`leads.refine`, idempotent per hour) or `POST /api/v1/admin/agents/refine`.
- Scan: up to 500 leads, unknown-sector first. Rules: `do_not_contact` (lead not yet opted out), `invalid_contact` (cannot be normalized), `classify_sector` (from name + notes), `clean_name` (zero-width characters, repeated spaces, digits-only or emoji-only names).
- Output: one proposal `apply_lead_fixes` capped at 200 fixes, identified by a digest so an identical batch is never proposed twice.
- Apply (after approval): per-field optimistic `UPDATE ... WHERE field = <value seen>`; skipped fixes are counted, never forced. It never deletes rows. Invalid contacts are marked opted out with the rule name in notes.

### 4.3 Order Aggregator (#13)
1. **Intake**: `POST /api/v1/admin/channel-orders/import` (permission `orders`) with `{ channel, orders: [...] }` or `{ channel, csv }`; Shopify via the hourly `channel.poll` job. Invalid rows are refused with readable reasons; duplicates are no-ops; a changed duplicate refreshes orders not yet proposed and is audited otherwise.
2. **Plan** (`channel.order` job): prepaid orders become `manual` (`prepaid_requires_manual`) because no payment ledger exists yet. Unmapped SKUs become `needs_mapping`. Otherwise it builds a store order body and proposes `import_order` through the Guardian.
3. **Execute**: `commerce.placeOrder` inside the approval transaction, using `prepareOrder` to validate. The idempotency key is derived from channel and external id, so a replay returns the same order and reserves stock once. The store price is authoritative; the Guardian warns when the channel's price differed.
4. **Failure**: stock or validation errors roll back to a savepoint, mark the channel order `rejected` with the reason, and mark the task `rejected`.
- Status values: `received`, `needs_mapping`, `manual`, `proposed`, `imported`, `rejected`.

Staff endpoints: `GET /api/v1/admin/channel-orders?status=`, `POST /api/v1/admin/channel-sku-map`.

## 5. Base agent class (`lib/agentic/base-agent.js`)

```js
class BaseAgent {
  constructor({ name, version, tools })     // tool: { name, kind: 'read'|'propose', action?, validate?, run }
  tool(name) / call(ctx, name, args)         // only allowlisted tools; unknown name -> 403
  handle(db, job)                            // kill switch -> plan(ctx) -> error log + rethrow for the queue
  plan(ctx, job)                             // subclass: read tools, then this.submit(...)
  submit(ctx, { sourceId, action, subject, evidence, proposal })   // Guardian, then agent_tasks proposal
  execute(tx, task, proposal)                // second Guardian review, tool.run, complete or reject
}
```
A `read` tool cannot be executed as an approved action; a `propose` tool runs only from `execute`.

## 6. Data model

Existing tables remain the core; v8 adds only what the three agents need. Money is integer minor units (piastres), time is epoch milliseconds.

| Domain | Tables |
| :--- | :--- |
| Customers | `store_customers`, `leads` (consent, opt-out, `last_contact_at`), `do_not_contact` (new) |
| Products | `store_products`, `inventory`, `inventory_history`, `price_list_items` (per-sector prices), `channel_sku_map` (new) |
| Orders | `store_orders` (+ items JSON, stock state, idempotency key), `channel_orders` (new), `cod_collections` |
| Agent logs | `agent_controls`, `agent_tasks` (evidence + proposal + status), `jobs`, `audit_log`, `guardian_decisions` (new), `guardian_usage` (new), `guardian_limits` (new) |

```
do_not_contact(contact_key PK, reason, source, created_by, created_at)
guardian_limits(agent, action, daily_limit >= 0, PK(agent, action))
guardian_usage(day, agent, action, count, PK(day, agent, action))
guardian_decisions(id PK, agent, action, subject, verdict, reasons JSON, task_id, created_at)
channel_orders(id PK, channel, external_id, status, payload JSON, raw_hash, reason, order_number, received_at, updated_at, UNIQUE(channel, external_id))
channel_sku_map(channel, external_sku, product_id, variant, PK(channel, external_sku))
```
Normalizing `store_orders.items` into an `order_items` table is still on the list in the enterprise blueprint; the aggregator does not depend on it.

## 7. Project layout

```
lib/agentic/        base-agent.js  registry.js  guardian.js  data-refinement.js  order-aggregator.js
lib/integrations/   channel-adapter.js  file-channel.js  shopify.js
lib/                existing modules: queue, agents (legacy agents + dispatcher hook), commerce, leads, outreach-policy, price-lists
test/agentic.test.js
```
`lib/agentic/` is used instead of `lib/agents/` to avoid colliding with `lib/agents.js`.

## 8. Roadmap

| Phase | Deliverables | Exit criteria | External needs | Cost |
| :--- | :--- | :--- | :--- | :--- |
| **1 Foundation** (done in code) | Migration v8, base class, Guardian, Data Refinement, Order Aggregator, file/Shopify intake, tests | `npm test` green; agents paused globally until staff enable | None | Free |
| 2 Core cycle | Lead -> quote -> order -> shipping -> collection: Segmentation, Content, Inbound Responder, Quote Builder, Follow-up, Fulfillment, Shipping Tracker (staff-entered), COD Collection; `payments` ledger so prepaid orders can be imported | One lead traced end to end with approvals and Guardian logs | Consent policy and a verified sending adapter (WhatsApp provider) before any real send | Free; sending provider may cost |
| 3 Channel expansion | Catalog Sync and Inventory Sync as export files, Shopify live if a store exists, Commission Ledger | Channel stock never exceeds available stock | Approved commission rates | Free |
| 4 Advanced | Tender Scanner/Compliance/Bid (local PDF extraction), Replenishment forecast, Lead Discovery via Places | A tender processed with a compliance checklist | Paid Places/OCR only if profit allows | Deferred paid |

## 9. Operating the foundation
1. Run `npm run db:migrate` (applies v8). New agents start unpaused individually, but the `global` control is paused by default; unpause it from `/store/agents` when ready.
2. Import channel orders, map SKUs, approve proposals in `/store/agents`.
3. Review non-pass Guardian decisions before approving anything marked `warn`.
4. The kill switch blocks new dispatch and execution; an already running transaction may complete.
