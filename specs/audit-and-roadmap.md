# Technical Audit & Improvement Plan

Scope: (1) product-image persistence bug, (2) agent/staff activity monitoring, (3) UI/UX and agentic architecture.
Status legend: DONE = shipped in this change, NEXT = recommended follow-up.

---

## 1. Product image not persisting

### Findings (code-verified)
| Layer | Finding | Status |
|---|---|---|
| Frontend | Selecting a file did nothing until the separate "رفع الصورة" button was pressed. Pressing **Save** alone sent the old `image_url`, so the product saved "successfully" with the old image. | DONE – file auto-uploads on select, and Save uploads first and aborts on failure |
| Frontend | No check that the saved product actually contains the new image. | DONE – UI compares the returned `image_url` with the sent one |
| API | `/api/store/admin/images` returned 503 whenever Vercel Blob was not configured, so uploads failed outright. | DONE – falls back to database storage (`product_images`, served at `/assets/store-products/db/<id>.<ext>`) |
| DB write | `saveProduct` upsert writes `image_url` correctly; the audit row omitted the image so a save looked identical with or without an image change. | DONE – audit records `image_changed` |
| Cache | `catalog.invalidate()` runs after save; storefront list cache TTL is 5 s. | OK |

### Debugging checklist (for any future "change not saved" report)
1. **Frontend state** – DevTools → Network: was `POST /api/store/admin/images` sent and did it return `201 {url}`? Does `#imageUrl` hold that url before Save?
2. **Request body** – on `PUT /api/store/admin/products/:id`, is `image_url` the new url (not the old one)?
3. **Validation** – `parseAdminProduct` rejects anything that is not `https://…` or `/assets/store-products/…` with a 400.
4. **Response** – does `product.image_url` in the PUT response equal what was sent?
5. **Storage** – Blob: token/store id present? DB fallback: row exists in `product_images`? `SELECT image_url FROM store_products WHERE id=?`.
6. **Audit** – `SELECT * FROM audit_log WHERE action='catalog.saved' AND resource=?` – `image_changed` must be `true`.
7. **Display** – hard refresh; check the `<img src>` loads (200, correct `Content-Type`).

---

## 2. Activity monitoring & auditing

### Delivered
- `lib/audit-format.js` – converts raw audit rows into readable Arabic sentences (actor name instead of UUID, action label, formatted details). Used by `/api/v1/admin/audit` and the new feed.
- `GET /api/v1/admin/activity` – live feed with category filter, per-agent status (running / paused / idle, actions in 24 h), KPIs (WhatsApp sent, searches, worker heartbeat).
- `/store/activity` now redirects to `/store/agents#activity`: the live feed is a tab of the unified agents page.
- `lib/activity.js` – `logActivity(agent, action, resource, details)` used by the WhatsApp sender (sent / failed / safety rest / outside hours / connected) and the scraper (search + results). Recipient numbers are masked.
- Staff page navigation and searches: tracked from the shared admin shell via `POST /api/v1/admin/activity/track` (rate-limited, actions `staff.page_view`, `staff.search`).
- Manager home, Agents and Operations pages now show readable entries instead of raw JSON.

### Schema / architecture (current → recommended)
Current: single append-only `audit_log(actor, action, resource, details JSON, created_at)`. Adequate to ~100k rows.

NEXT, when volume grows:
```
activity_events(
  id, ts, actor_type['staff'|'agent'|'customer'|'system'], actor_id,
  session_id, event_type, resource_type, resource_id,
  outcome['ok'|'denied'|'error'], ip_hash, user_agent_hash,
  payload JSON            -- already redacted
)
INDEX (ts), (actor_id, ts), (event_type, ts)
```
- Retention: raw 90 days, daily roll-ups kept 2 years; pruned by the worker.
- Redaction at write time: mask phone numbers, never log message bodies, passwords or codes.
- Real-time: SSE endpoint (`/api/v1/admin/activity/stream`) replacing polling.
- Alerts: rules such as >N failed WhatsApp sends / hour, send outside 9-6, repeated denied access, admin export.
- Tamper evidence: hash-chain each row (`prev_hash`) so edits are detectable.
- Privacy/compliance: tell staff that navigation and searches are logged, limit viewing to the admin role, and keep the purpose limited to QA and security.

---

## 3. UI/UX and agentic architecture

### Design language
- **Tokens**: emerald 900/700/500 primary, slate neutrals, amber = warning, red = error; 8-pt spacing; radius 12/16; Cairo font, 14–15 px body, 26 px page titles.
- **Layout**: one shared shell (top bar + section nav) – already in `views/admin-shell.js`; every admin page uses `zs-*` components (KPI card, panel, table, chip, empty state).
- **Rules**: never show IDs, JSON or English action codes to users; every list has an empty state, a loading state and an error state; one primary action per panel; status shown as colored chips with text (not color alone); RTL and mobile first.
- NEXT: migrate `storeAdmin.js` and `operations.js` (still use their own CSS) onto the `zs-*` components; add a global command-palette search.

### Agentic e-commerce architecture
1. **Event bus / job queue** (exists: `jobs`, `worker.js`) – every business event (order created, stock low, lead found) enqueues a job.
2. **Agents = small, single-purpose workers** (marketing, inventory, support, sales, affiliate, ads, manager) with a registry, per-agent kill switch (`agent_controls`, exists) and per-agent permissions.
3. **Propose → approve → execute**: agents write `agent_tasks` proposals; a human approves anything customer-facing or money-related (exists). Autonomy can be raised per task type once its approval rate is consistently high.
4. **Guardrails as code**: `outreach-policy` (30-day rule, 9-6 hours, 5-message rest, sector catalog isolation) enforced in the sender, not in prompts.
5. **Observability**: every agent step writes to the activity log (this change), plus metrics: queue depth, oldest job, failure rate, tokens used.
6. **Reliability**: idempotency keys (exists), retries with dead-letter + manual retry (exists), health endpoints, backups (`backup.yml`).
7. **Single data store**: Turso/libSQL in production; the standalone legacy agents (WhatsApp, scraper) should move off their local sql.js file onto the same DB so everything is visible in one place.

### Prioritised roadmap
1. (done) image fix, readable audit, live activity page, agent logging.
2. Install dependencies in CI and make `npm test` green; add tests for `audit-format` and the image-upload path.
3. Move legacy agents' data to the shared DB; add SSE stream and alert rules.
4. Migrate remaining admin pages to the shared design system.
5. Per-role dashboards (operations, support, marketing) built on the same activity data.
