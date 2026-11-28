# AI COMMANDER 2 — implementation record

Date: 2026-11-28. Companion to `plan.md`. This file records what exists in the repository and what was actually verified. Nothing here is deployed.

## Verified locally

`npm run check` passed. `npm test`: 101 tests, 100 passed, 0 failed, 1 skipped (isolated Turso concurrency test, needs credentials). Tests use in-memory sql.js and synthetic data only.

## Built (code + test)

| Area | Where | Evidence |
|---|---|---|
| Migration 17 (priority column, `commander_tasks`, `commander_events`, `crm_notes`, `crm_opportunities`, five new agent controls, all starting paused) | `lib/migrations.js` | `test/commander.test.js` replay test |
| Task engine: create, assign, approval gate, schedule, execute, retry, cancel, expiry, dependencies | `lib/commander.js` | commander tests 1, 3, 4, 5 |
| Idempotency key + request hash; same key with different body returns 409 | `lib/commander.js` `create` | test 1 |
| Immutable approval: decision event stores the exact input; stale CRM updates are refused (optimistic `updated_at`) | `review`, `crm.update_opportunity` | test 3 |
| Transactional execution: domain write and result commit together; failure rolls back and records only the failure | `execute` | test 5 |
| Retry: bounded (5 attempts), new queue generation supersedes older leased jobs | `control`, `execute` | test 5 |
| Global / per-agent pause defers without consuming attempts | `execute` | test 4 |
| Allowlisted tools: `manager.report`, `bi.report`, `pricing.simulate`, `distribution.report`, `procurement.report`, `crm.note`, `crm.create_opportunity`, `crm.update_opportunity` | `lib/commander-tools.js` | tests 1, 2, 6 |
| Daily manager report scheduled once per Cairo day after 09:00 | `commander.tick`, `worker.js`, `lib/cron-worker.js` | idempotency key `commander-daily-<date>` |
| HTTP API, `agents` permission, CSRF, rate limit | `lib/commander-api.js` | `test/http.test.js` (403 for non-admin and for missing CSRF, 200 for admin) |
| Dashboard section on `/store/agents`, plus read-only `/commander/ask` explainer | `views/agents.js`, `assets/commander.js`, `lib/commander-assistant.js` | not covered by browser tests |
| Roster now lists 20 agents | `lib/agent-roster.js` | `test/agent-roster.test.js` |

## Not built, or not proven

These stay out of any "completed" claim.

- No real provider verification. WhatsApp, SMTP delivery events, Meta and Telegram still rely on the existing channel code; no new send test, no IMAP, no bounce handling was added in this change.
- No new price, discount, commission, purchase-order, payment or invoice write tool. `pricing.simulate` and `procurement.report` are read/simulation only.
- No customer merge/delete operation in the new runtime (unsupported by design until a reviewed domain operation exists).
- Excel: existing import paths unchanged. No production XLSX parser decision was made.
- PostgreSQL not adopted; sql.js locally and Turso in production remain the engines (see plan section 1).
- Agent execution cost is reported as `null` (no cost source).
- Distribution report has sector counts only; there is no region/territory data.
- ROI is `null` with a stated reason; there is no verified cost and attribution data.
- The dashboard UI has no automated browser test; it has not been exercised in a browser here.
- Staging migration, Turso run and real backup/restore rehearsal were not performed.
- Agents 02–08, 10–15 keep their previous behaviour; this change did not add new tools for them beyond the manager, CRM and four new agents.

## Next steps, in order

1. Open `/store/agents` locally and exercise each task type, approval, retry and cancel in a browser.
2. Run migrations 17 and 18 on an isolated staging database, then confirm the five new agents are running (migration 18 unpauses them) and the global switch is as intended.
3. Click "run all" once and read the per-agent result; pricing and CRM need a task from the task center.
4. Provider smoke tests per channel with test recipients, as a separate gate before commercial use.

## Run-all button (added 2026-11-28)

`POST /api/v1/admin/agents/run-all` now gives every one of the 20 agents an outcome (`lib/agent-work.js`, tested in `test/agent-run-all.test.js`, and clicked in a real browser against a local database).

- done: manager, ads, inventory (when low stock exists), marketing (one draft per sector with consenting leads, weekly, sector catalog respected), bi, distribution, procurement (internal report tasks with evidence).
- idle: checked and nothing eligible (orders, support, refinement, outreach, sales, affiliate, aggregator without a channel).
- external: whatsapp, scraper (separate processes), email, social. The button reports their real state and queue size; it never sends messages (existing rule, still enforced by test).
- skipped: pricing and crm need an input (product and cost, lead and note), and any manually paused agent.
- Migration 18 unpauses the five commander agents that migration 17 had created paused. The global switch and per-agent pause still apply.
- Repeated clicks in the same hour create no duplicate proposals or tasks.
