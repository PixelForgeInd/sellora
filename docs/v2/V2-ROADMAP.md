# Sellora V2 — Umbrella Roadmap

## Purpose
Deliver a stable V2 release through small, reviewable feature PRs. All V2 child PRs target `feature/v2-umbrella`; the umbrella PR targets `develop`. Merge the umbrella PR to `develop` only after all child PRs are reviewed, integrated, and validated. Do not merge directly to `main`.

## Child workstreams
1. **V2.1 — Platform Owner Dashboard**: owner-only control centre for businesses, subscriptions, plans, payment/renewal state, and audit history.
2. **V2.2 — Dynamic Bulk Product Import**: CSV/XLSX import generated from each business's configured product fields, with column mapping, validation preview, row-level errors, and explicit create/update modes.
3. **V2.3 — Subscription Billing and Access Enforcement**: one Sellora plan with monthly and yearly billing; monthly ₹249, yearly ₹2,490 (12 months for the price of 10); verified payment collection, due dates, expiry locking, and access restoration.

## Commercial rules
- Monthly: ₹249 per billing period.
- Yearly: ₹2,490 for 12 months (two months free versus ₹2,988 for 12 monthly payments).
- Both intervals include the same launch feature set.
- Show price, interval, next due date, payment state, and applicable taxes before checkout.
- Only a verified server-side provider confirmation/webhook can mark a subscription paid; webhook processing must be idempotent.
- Platform subscription billing is separate from each tenant's customer checkout and merchant-owned Razorpay credentials.

## Subscription lifecycle
- Create an explicit subscription record for each tenant/business account; an existing user account alone does not grant paid access.
- Store plan/billing interval, amount/currency, current period start/end, next due date, provider IDs, payment status, last successful payment, and cancellation/suspension timestamps.
- Example: a subscription due on the 11th remains active through that day. If no successful payment is confirmed by the end of the 11th, lock protected workspace and public catalogue access from the 12th.
- A verified payment extends the term and restores access automatically. Pending/failed/unverified payments do not unlock.
- Show a clear locked/expired page with a secure payment action; preserve tenant data while locked.
- Use Asia/Kolkata for billing date decisions at launch.

## Security and release
- Every platform administration API must enforce the authenticated `PLATFORM_OWNER` role server-side.
- Enforce subscription status in the API and public catalogue routes, not just frontend navigation.
- Keep platform billing credentials separate from tenant-owned payment gateway credentials.
- Never log or expose secrets, raw payment credentials, or signatures.
- Audit manual status changes, refunds, renewals, and owner actions.
- Use migrations and tests; never reset production data to apply schema changes.

## Delivery order
1. Review the child specifications.
2. Implement/test dynamic bulk import.
3. Implement the Platform Owner Dashboard.
4. Implement subscription checkout, webhook reconciliation, expiry locks, and restoration.
5. Run build, migration, API, access-control, and payment-provider sandbox tests before merging V2 to `develop`.

## Acceptance criteria
- Each child PR is focused and has its own validation notes.
- No subscription is shown as paid without verified evidence.
- Tenants cannot bypass a lock by calling APIs directly or opening public catalogue URLs.
- A successful payment restores access without manual database edits.
- Existing tenant data and merchant payment configuration remain intact.
