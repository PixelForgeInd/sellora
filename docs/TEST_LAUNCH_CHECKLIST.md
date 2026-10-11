# Sellora Test Launch — Step-by-Step QA Guide

**Purpose:** Repeatable manual test plan for Sellora before a controlled pilot launch.  
**Pilot tenant:** Ganeshaa Sutra.  
**Recommended environment:** Staging with a separate test database and Razorpay test credentials.  
**Rule:** Never run destructive tests against real customer records or use live payments during staging.

## 0. Record the test run

- Test date:
- Tester:
- Git branch / commit:
- Deployment URL:
- Browser and device:
- CI run URL:
- Database migration status:
- Razorpay mode: Test / Live (staging must use Test)
- Result: Not started / Pass / Fail / Blocked

For each failed test, record the test ID, steps, expected result, actual result, screenshot, browser/API error, severity and commit that fixes it.

Severity:
- **P0 — Critical:** security exposure, cross-tenant data access, payment integrity failure, data loss.
- **P1 — Launch blocker:** a core signup, catalogue, enquiry, order, stock or payment flow does not work.
- **P2 — Normal:** non-critical functional issue with a workaround.
- **P3 — Cosmetic:** spacing, wording or other visual defect.

## 1. Confirm the build is safe to test

1. Open the repository pull request and inspect the latest CI checks.
2. Confirm the application build and formatting workflows pass.
3. Wait for automated API/integration tests to finish; confirm they pass.
4. If any check fails, capture the failing job and logs, fix it, and rerun the checks.
5. Confirm the deployment uses the intended commit and branch.
6. Do not merge or launch publicly with failing required checks.

**Pass criteria:** Required CI checks are green and the deployed code matches the reviewed commit.

## 2. Prepare staging safely

1. Deploy to a staging URL with HTTPS.
2. Configure the correct database URL, public API origin, CORS, upload storage and required environment variables.
3. Keep secrets on the server; never commit API secrets or encryption keys.
4. Confirm Prisma migrations are applied to the staging database and match the application schema.
5. Confirm uploaded product images persist after an app restart/redeployment.
6. Confirm backups or a recovery path exist before destructive tests.
7. Verify Razorpay uses test credentials and test mode.
8. Open the app on desktop and mobile; note the deployed commit and URL in the test record.

**Pass criteria:** Staging loads over HTTPS, the database schema is current, uploads persist, and no live payment credentials are used.

## 3. Test account and business setup

### AUTH-01 — Sign up
1. Register a new test business account using a dedicated test email.
2. Complete the business setup.
3. Sign out and sign back in.

Expected: The account is created once and the correct dashboard opens after login.

### AUTH-02 — Business profile
1. Enter business name, phone, email, address and logo.
2. Save, refresh and sign in again.

Expected: Saved profile details persist and appear correctly.

### AUTH-03 — Password change and recovery
1. Test password change with the correct current password.
2. Try an incorrect current password.
3. Test password recovery using a valid token, then try reusing an expired or already-used token.

Expected: Valid changes work; invalid credentials and invalid/reused recovery tokens are rejected.

## 4. Test product management

Create these test products with clearly identifiable names. Example values only:
- Product A: 20's Recycled OE Yarn, price ₹122/kg, stock 10.
- Product B: 20's Navy, price ₹134/kg, stock 0.

### PROD-01 — Create
1. Add a product with required name, SKU, price, unit, category and other supported attributes.
2. Save and refresh the page.

Expected: Product appears once with the correct values.

### PROD-02 — Image upload
1. Upload a valid product image.
2. Refresh and sign in again.
3. Try an unsupported file type and an oversized file.

Expected: Valid image persists; invalid uploads are rejected with a clear error.

### PROD-03 — Edit product and stock
1. Open Edit and change product details.
2. Set stock to a positive quantity and save.
3. Reopen Edit and confirm it persisted.
4. Set stock to 0 and save.
5. Reopen Edit and confirm zero is retained.

Expected: Edits persist, and zero is treated as a valid quantity—not as an empty field.

### PROD-04 — Delete
1. Delete only a disposable test product.
2. Refresh the library and public catalogue.

Expected: Deleted product no longer appears for sale. Existing order-history records should remain accurate where applicable.

## 5. Test catalogue publishing and public access

### CAT-01 — Publish
1. Select products for a catalogue.
2. Publish it and copy the public URL.
3. Open the URL in an incognito/private browser without logging in.

Expected: Public catalogue opens without dashboard authentication and shows the correct business and products.

### CAT-02 — Selling mode
1. Test Catalogue Only mode.
2. Test Catalogue + Online Payments mode.
3. Confirm the displayed actions match the configured mode.

Expected: Checkout is only offered when online payments are enabled and the catalogue is configured for it.

### CAT-03 — Mobile and sharing
1. Open the public URL on a phone-sized viewport and a real mobile device if possible.
2. Test product images, navigation, enquiry buttons and WhatsApp sharing.
3. Check for horizontal overflow, clipped labels and dead buttons.

Expected: Layout is usable, links work and the correct catalogue URL is shared.

## 6. Test enquiries and customers

### ENQ-01 — Successful enquiry
1. Submit an enquiry from the public catalogue with test customer name, phone and message.
2. Submit another enquiry for a specific product.

Expected: A clear confirmation appears and each enquiry is saved once with the correct product association.

### ENQ-02 — Validation
1. Try submitting with required fields missing or invalid.
2. Refresh after submission and verify there is no accidental duplicate.

Expected: Invalid submissions are rejected clearly; one submission does not create duplicate records.

### ENQ-03 — Dashboard visibility
1. Open Enquiries and Customers in the business dashboard.
2. Open the customer history and verify enquiry/order associations.

Expected: Records and customer details match the public submissions and belong to the correct tenant.

## 7. Test stock and purchase restrictions

Use only test products and test orders.

### STK-01 — Zero stock
1. Set stock tracking to enabled and quantity to 0.
2. Open the public catalogue.
3. Open the product card and product details.

Expected: The product is clearly marked **Out of stock**. Purchase/add-to-cart actions are unavailable. The enquiry option remains available.

### STK-02 — Positive stock
1. Set stock to 10.
2. Confirm the product is purchasable when checkout is enabled.
3. Place a test order for a quantity of 2 and complete the relevant test flow.

Expected: The order follows the configured reservation/deduction process and stock reflects the expected remaining quantity.

### STK-03 — Insufficient stock and concurrent attempts
1. With 10 available, attempt to order 11.
2. Attempt two orders whose combined quantity exceeds available stock, using separate sessions if possible.

Expected: Server-side validation rejects unavailable quantities; stock cannot go negative due to concurrent checkout.

### STK-04 — Restocking after cancellation/refund
1. Create an eligible test order that reserves stock.
2. Cancel it or complete the supported refund workflow.
3. Trigger/retry the relevant callback only in a safe test environment.

Expected: Stock is restored according to the business rules and is never restored twice for the same order.

## 8. Test Razorpay and payment integrity

Razorpay test payments have been reported as working, so this section is a regression check. Keep staging on test credentials.

### PAY-01 — Successful payment
1. Place an order using the published payment-enabled catalogue.
2. Complete a Razorpay test payment.
3. Verify the result in the Sellora order and payment history.

Expected: Server-side verification confirms the payment; the order is marked paid only after verified success; amount and currency match the server-calculated order.

### PAY-02 — Failed or cancelled payment
1. Use the supported Razorpay test flow to simulate a failed or cancelled payment.
2. Return to Sellora and inspect the order.

Expected: The order is not incorrectly marked paid and unpaid amounts are not included in paid revenue.

### PAY-03 — Duplicate events
1. Refresh or revisit the payment callback page.
2. In staging, verify webhook retry/idempotency behaviour where practical.

Expected: No duplicate paid orders, payment records, or stock movements are created.

### PAY-04 — Server-side protections
1. Inspect that the server recalculates prices and totals from trusted product/order data.
2. Confirm a client cannot mark an order as paid by changing browser state or request fields.
3. Confirm webhook signatures and gateway payment verification are required.

Expected: Manipulated or unverified payment updates are rejected.

### PAY-05 — Refunds
1. Only if refund handling is enabled in the test environment, run a test refund.
2. Compare gateway status, Sellora payment/order status and stock.

Expected: Refund state reflects verified gateway results and any stock restoration is idempotent.

## 9. Test orders and reporting

### ORD-01 — Order management
1. Open a test order.
2. Update supported order details, fulfilment status, delivery address or notes.
3. Refresh the page.

Expected: Changes persist and affect only the intended order.

### ORD-02 — Delivery slip and CSV
1. Generate/print a delivery slip.
2. Export orders to CSV.
3. Compare customer, items, quantity, totals and status against the order.

Expected: Documents and exports contain accurate records without exposing another tenant's data.

### REP-01 — Reports
1. Select a date range with known test orders.
2. Compare counts and revenue with the underlying orders and payment history.
3. Test empty date ranges and boundary dates.

Expected: Paid revenue includes only appropriately verified paid transactions; filters and totals are consistent.

## 10. Test security and tenant isolation

Use two separate test business accounts. Do not use real customer information.

### SEC-01 — Cross-business isolation
1. Create a product, customer, enquiry and order under Business A.
2. Sign in as Business B.
3. Attempt to access Business A's records through normal UI and, where authorised, direct API requests.

Expected: Business B cannot view or modify Business A's private records. Treat any leakage as P0 and stop the pilot.

### SEC-02 — Authentication and authorization
1. Sign out.
2. Try accessing protected dashboard/API routes.
3. Try actions with an expired or invalid session.

Expected: Protected requests are rejected and no private data is returned.

### SEC-03 — Input validation
1. Try negative stock, invalid prices, missing required fields and malformed requests.
2. Try unsupported/oversized image uploads.

Expected: Server-side validation rejects invalid inputs; the app does not silently save corrupt data.

## 11. Reliability and user-interface checks

1. Refresh each important dashboard page.
2. Sign out and sign back in.
3. Restart the staging application if permitted.
4. Confirm products, profile, enquiries, orders and payment history persist.
5. Test the main flows on desktop and mobile.
6. Check browser console, API responses and server logs for uncaught errors.
7. Verify buttons, empty states, date filters, modals, loading states and error messages.

Expected: No broken core flow, lost persisted data, unexplained console errors or non-functional controls.

## 12. Log bugs and rerun regressions

For every failure, record:
- Test ID:
- Severity (P0/P1/P2/P3):
- Steps to reproduce:
- Expected result:
- Actual result:
- Screenshot/video:
- Browser console/API/server error:
- Commit or issue reference:

After a fix:
1. Rerun the failed test.
2. Rerun related tests (for example, stock changes require checkout, cancellation and reports regression checks).
3. Rerun CI and automated API tests.
4. Confirm the fix is deployed to staging before closing the bug.

## 13. Final launch decision

**Controlled pilot is permitted only when:**
- Required CI and automated integration tests pass.
- Database migrations and backups/recovery are verified.
- Signup, product creation, publishing, enquiries and order management pass.
- Zero-stock products cannot be purchased but can still be enquired about.
- Payment success/failure and server-side verification pass in test mode.
- Tenant isolation and authentication pass.
- No unresolved P0/P1 issues remain.
- Production configuration, HTTPS, persistent storage and monitoring are ready.

Start with Ganeshaa Sutra and a small group of trusted customers. Keep payments in test mode during staging. Switch to live payment credentials only after production configuration and payment verification are separately checked.

**Suggested test report filename:** `docs/TEST_LAUNCH_CHECKLIST.md`
