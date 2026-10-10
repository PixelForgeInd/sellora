# Sellora Testing Guide

Use this checklist for each release candidate and before merging changes that affect the workspace. The automated API checks use the same core cases listed below; UI and persistence scenarios remain manual until browser/database test infrastructure is added.

## Test environment

1. Use a local development environment or a dedicated staging environment. Do not run destructive tests against production.
2. Start PostgreSQL and apply the repository's migrations.
3. Configure `DATABASE_URL`, `AUTH_SECRET`, `API_PORT=4000`, and `WEB_ORIGIN=http://localhost:5173` in the API environment.
4. From the repository root, run `npm ci`, `npm run db:generate`, and `npm run build`.
5. Start the API and frontend using `npm run dev`. Open `http://localhost:5173`.
6. Use a unique test email address. Do not put real customer data or production credentials into tests.

## A. Automated checks

Run locally from the repository root:

```bash
npm run db:generate
npm run build
# Start the API on port 4000 in another terminal, then:
npm test
```

The GitHub Actions workflow runs the build and API smoke tests automatically for pull requests targeting `develop` and pushes to `develop`.

| ID | Scenario | Expected result | Automated |
|---|---|---|---|
| API-01 | GET `/api/health` | HTTP 200 and `{ ok: true, service: "sellora-api" }` | Yes |
| API-02 | GET `/api/workspace/business` without a token | HTTP 401 | Yes |
| API-03 | GET `/api/products` and `/api/products/:id` | HTTP 410; legacy routes stay retired | Yes |
| API-04 | POST `/api/products` and PATCH `/api/products/:id` | HTTP 410; legacy mutations stay retired | Yes |
| API-05 | Signup with invalid email / too-short password | HTTP 400 validation error | Yes |
| API-06 | Login with malformed credentials | HTTP 400 validation error | Yes |

## B. Manual end-to-end checklist

Mark each item Pass or Fail and record the issue/steps to reproduce for failures.

### Account and onboarding
- [ ] UI-01 — Sign up with a new test email and a password of at least 8 characters. Confirm the workspace opens.
- [ ] UI-02 — Try signing up with an invalid email and a short password. Confirm validation is shown and no account is created.
- [ ] UI-03 — Log out, then log in with the created account. Confirm the same workspace loads.
- [ ] UI-04 — Try an incorrect password. Confirm access is denied with a clear error.
- [ ] UI-05 — Complete onboarding with business name, category, model, and brand colour. Refresh and confirm the business persists.

### Products and custom fields
- [ ] UI-06 — Create a product with a name, price, currency/unit, optional image, and category-specific fields.
- [ ] UI-07 — Edit the product and confirm changed values persist after refresh.
- [ ] UI-08 — Delete a test product and confirm it disappears from the list.
- [ ] UI-09 — Add a custom field, save it, refresh, and confirm it persists. Try invalid select options if applicable.
- [ ] UI-10 — Verify a user cannot read or modify another business's data (use two separate test accounts).

### Catalogues and public access
- [ ] UI-11 — Create a catalogue and select products. Reopen it and verify selected products are retained.
- [ ] UI-12 — Preview the catalogue before publishing.
- [ ] UI-13 — Publish it and open its public URL in a private/logged-out browser window.
- [ ] UI-14 — Unpublish it and verify public access follows the expected unpublished behaviour.
- [ ] UI-15 — Copy the public link and test the WhatsApp share action.
- [ ] UI-16 — Check a catalogue with no products and a product with no image; confirm empty states render cleanly.

### Settings, responsive layout, and regressions
- [ ] UI-17 — Update business details and brand colour; refresh and verify persistence.
- [ ] UI-18 — Test desktop and mobile-width layouts for auth, onboarding, products, catalogue editor, settings, and public catalogue.
- [ ] UI-19 — Check browser console and API logs for unexpected errors.
- [ ] UI-20 — Confirm existing Ganeshaa Sutra yarn records/prices and legacy routes are not unintentionally changed by generic catalogue work.
- [ ] UI-21 — Verify payment settings do not imply that a live payment gateway is connected when it is not.

## C. Record results

For every manual test run, record:

- Date and tester
- Commit SHA / branch tested
- Environment (local or staging; never include secrets)
- Test ID and Pass / Fail / Blocked
- Actual result and expected result
- Reproduction steps, screenshots, and relevant sanitized logs for failures

## Scope and limitations

The current automated suite is an API smoke-test baseline, not full browser automation. It does not yet test database-backed signup/login, product CRUD, catalogue publishing, cross-tenant isolation, or real browser interactions. These remain in the manual checklist until a dedicated test database and browser E2E suite are added. A green CI run therefore means build/type-check and the listed API smoke tests passed; it does not mean every UI flow was tested.
