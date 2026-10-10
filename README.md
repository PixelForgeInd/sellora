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
