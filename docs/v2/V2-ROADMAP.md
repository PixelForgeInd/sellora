# Sellora V2 — Umbrella Roadmap

## Purpose
Deliver a stable V2 release through small, reviewable feature PRs. All V2 work branches from `feature/v2` and targets `feature/v2`; the umbrella PR targets `develop`. Merge the umbrella PR to `develop` only after all child PRs are reviewed, integrated, and validated. Do not merge directly to `main` as part of this work.

## Child workstreams
1. **V2.1 — Platform Owner Dashboard**: owner-only control centre for businesses, subscriptions, plans, payment/renewal state, and audit history.
2. **V2.2 — Dynamic Bulk Product Import**: CSV/XLSX import generated from the business's configured product fields, with column mapping, validation preview, row-level errors, and explicit create/update modes.
3. **V2.3 — Subscription Billing and Access Enforcement**: one Sellora plan with monthly and yearly billing; monthly ₹249, yearly ₹2,490 (12 months for the price of 10); payment collection, due dates, grace/lock behavior, and access restoration after verified payment.

## Commercial rules
- Monthly: ₹249 per billing period.
- Yearly: ₹2,490 for 12 months (two months free compared with 12 × ₹249 = ₹2,988).
- The same feature set applies to both billing intervals for launch.
- Show the price, billing interval, next due date, payment state, and applicable taxes clearly before checkout.
- Do not mark an account paid based only on a browser redirect or client-side claim. Confirm payment through a verified server-side webhook/provider API and make webhook processing idempotent.
- The platform subscription is separate from each tenant's customer checkout payments and Razorpay credentials.

## Subscription lifecycle
- Create an explicit subscription record for each tenant/business account; never infer paid access merely because a user exists.
- Store plan/billing interval, amount/currency, current period start/end, next due date, payment status, provider subscription/payment IDs, last successful payment, and cancellation/suspension timestamps.
- For a due date on the 11th, access remains active through the 11th; if no successful payment is confirmed by the end of that day, lock protected workspace and public catalogue access from the 12th.
- When a valid payment is confirmed, extend the period and restore the workspace/catalogue automatically. Do not unlock on a pending or failed payment.
- Provide a clear locked/expired screen with the amount due and a secure payment action; preserve data while locked.
- Define and test timezone behavior consistently (Asia/Kolkata for Indian accounts at launch).

## Security and operations
- Only authenticated `PLATFORM_OWNER` accounts may use platform administration APIs.
- Enforce tenant subscription access on the API/server, not just by hiding frontend navigation.
- Keep platform billing credentials separate from merchant-owned Razorpay credentials used by tenant storefronts.
- Never log or expose secrets, raw payment credentials, or payment signatures.
- Add audit events for manual status changes, refunds, renewals, and owner actions.
- Use migrations, tests, sandbox payment flows, and deployment notes; never reset production data to apply schema changes.

## Delivery order
1. Review/merge the umbrella and specifications into `feature/v2`.
2. Implement and test bulk import.
3. Implement the Platform Owner Dashboard against the subscription/business APIs.
4. Implement platform subscription checkout, webhook reconciliation, expiry locks, and restoration.
5. Run build, migration checks, API tests, access-control tests, and payment-provider sandbox tests before merging V2 to `develop`.

## Acceptance criteria
- Each child PR has a focused scope and does not include unrelated features.
- No subscription is shown as paid without verified payment evidence.
- A tenant cannot bypass expired/locked status by calling the API directly or opening a public catalogue URL.
- A successful payment restores access without manual database edits.
- Existing tenant data and merchant payment configuration remain intact.
