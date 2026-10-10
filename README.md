# Sellora — Digital Catalogues. Smarter Sales.

Sellora is a self-service B2B catalogue platform. Businesses create an account, describe what they sell, manage industry-specific product records, build a catalogue and publish a shareable customer-facing link.

## Phase 1–6 MVP in this branch

1. Authentication: email/password sign-up and login, Node.js scrypt password hashes and signed seven-day bearer tokens.
2. Business onboarding: business name, category, business model, contact details and brand colour; starter field templates for yarn/textiles, clothing, furniture, electronics and other products.
3. Business workspace: overview, setup checklist, product and catalogue counts.
4. Generic product library: SKU, description, optional price, currency, unit, image URL and industry-specific fields.
5. Catalogue builder: create catalogues and choose which business-owned products they contain.
6. Publish/share: publish or unpublish and share a public route at /c/:slug.
7. Selling preferences: business owners can switch between catalogue-only and catalogue + online payments from dashboard Settings. Gateway status is stored separately; online checkout remains unavailable until a real gateway connection, order flow and verified payment handling are implemented.

The previous yarn-specific data models remain. Generic Sellora models are additive. Legacy yarn records are not automatically copied into a new workspace because the old records do not have reliable tenant ownership; importing them needs a deliberate mapping step.

## Stack

- Node.js 24 and npm workspaces
- React 19, TypeScript and Vite 8
- Express 5 and Zod
- PostgreSQL and Prisma 6
- Node.js crypto for password hashing and signed session tokens

## Local setup

1. Install Node.js 24+ and PostgreSQL.
2. Create a PostgreSQL database named sellora.
3. Copy .env.example to .env and set DATABASE_URL and a long random AUTH_SECRET.
4. Install dependencies and generate Prisma Client:

   npm install
   npm run db:generate

5. Apply migrations and seed reference data:

   npm run db:migrate
   npm run db:seed

6. Start the apps:

   npm run dev

7. Open http://localhost:5173. API health check: http://localhost:4000/api/health.

For an existing development database, back it up before applying the new migration. The migration adds nullable business ownership and generic product/catalogue tables; it does not delete yarn tables.

## Main API routes

- POST /api/auth/signup, POST /api/auth/login, GET /api/auth/me
- GET /api/workspace/business, POST /api/workspace/business
- GET/POST /api/workspace/products, PATCH/DELETE /api/workspace/products/:id
- GET/POST /api/workspace/catalogues, PATCH /api/workspace/catalogues/:id
- GET /api/public/catalogues/:slug
- PATCH /api/workspace/business/settings (authenticated; accepts `sellingMode: CATALOG_ONLY | ONLINE_PAYMENTS`)
- GET /api/health

Workspace routes require Authorization: Bearer <token>. Product and catalogue operations scope records to the signed-in user's business. Public catalogue routes expose only published catalogues.

## Production hardening still required

This is an MVP foundation, not a production launch approval.

- Set a strong, unique AUTH_SECRET; never use the development fallback in production.
- Add rate limiting, email verification, password reset, session revocation and abuse controls.
- Restrict or remove legacy unauthenticated admin endpoints in apps/api/src/index.ts before public deployment.
- Add automated API/browser tests, including cross-tenant authorization tests.
- Add image uploads/storage, catalogue SEO metadata and enquiry/order capture.
- Configure HTTPS, production CORS, secret management, backups and monitoring.
- Run migrations against a backed-up staging database before production.

## Structure

- apps/api: Express API, Prisma schema and migrations
- apps/web: React frontend and public catalogue view

## Public catalogue template

- All published business catalogues use the shared, responsive public storefront renderer.
- The renderer is populated with that business's own branding, catalogue title/description, products, product fields and contact information.
- Demo route: `/demo/ganeshaa-sutra` displays a sample Ganeshaa Sutra catalogue without requiring an account or API data. This is a preview route; it does not create a real business or order records.
- Live business catalogues continue to use `/c/:slug`.
- Deploy the web app with SPA fallback enabled before sharing the demo URL publicly. No production deployment URL is configured in this repository yet.


## Version 3 — Cart and checkout

The public catalogue now supports a customer cart and checkout when the business has selected **Catalogue + online payments** as its selling mode.

- Add priced products to a cart, adjust quantities, and review the subtotal.
- Submit customer contact and delivery details with an order.
- The API rechecks that the catalogue is published, products belong to it and remain active, and each item has a fixed positive price. It calculates totals on the server and snapshots product names, prices, quantities and totals.
- Orders receive a unique reference and begin with `PENDING` / `UNPAID` statuses.
- Checkout is currently an **order request only**. No payment is collected and no gateway is integrated in this version. The customer is told this before submitting.

### Apply the Version 3 database changes

After pulling this branch, run:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run build
```

When Prisma asks for a migration name, use `sellora_cart_checkout_orders`. Back up your database before applying schema changes to an existing environment.

### Not included yet

Payment gateway creation/capture/webhook verification, shipping/tax calculations, stock reservation, order management in the business dashboard, customer notifications, and subscription billing are later-version work. Do not treat an order as paid based on the checkout response.
