# Purchasing and goods receipts

Implemented local ERP milestone. UI: `/store/purchasing`. Data: migration 15 in the existing SQLite/libSQL schema. All data endpoints require the new `purchasing` permission, assigned only to administrators, with the existing staff session, origin and CSRF protections. Staff agents cannot approve purchases or record receipts.

## Workflow

1. Register a supplier with a name and optional contact.
2. Create an immutable draft purchase order with 1–50 distinct active products, integer stock-unit quantities, unit costs in integer piastres, and optional notes. The total is calculated by the server; selling prices remain unchanged.
3. Staff approve the draft or cancel an unreceived draft/approved order. Approval changes no stock and sends nothing to suppliers.
4. After physical inspection, record a full goods receipt with a unique reference. Partial receipts and supplier returns are later work. The stock increase, inventory history, queue events, receipt, order status, audit entries and replay record commit atomically.

## Integrity and replay

Supplier/order creation and receipt requests require `Idempotency-Key`. A replay with the same normalized payload and actor returns the saved result; changed inputs with the same key return 409. The browser retains its attempt key through network failures while the page remains open. A receipt also has unique order and reference constraints, so resubmitting the same order/reference after a reload cannot increase stock twice. A received/cancelled order cannot be approved or receive further stock.

Cost bounds: quantity 1–1,000,000 per line; unit cost 0–1,000,000,000 piastres; total at most 100,000,000,000 piastres. Existing stock-adjustment rules and integer validation apply. Product names and costs are snapshotted on the order.

## Interface and limits

Arabic RTL, existing emerald/Cairo identity, labelled forms, semantic tables, keyboard focus, live status feedback and responsive horizontal table scrolling. The workspace lists the latest 100 orders. Supplier and product choices are loaded from the database; no sample business data is inserted.

This milestone covers purchasing records and stock intake, not supplier payments, tax invoices, general ledger, valuation, multiwarehouse stock or external supplier integration. Migration 15 must be applied to staging and production before enabling the new interface. No production migration or deployment has been performed. Automated tests cover replay, invalid lines, approval rules, stock rollback, retained retail prices and HTTP permissions/CSRF. Browser visual QA remains unverified because the browser connection host is unavailable.
