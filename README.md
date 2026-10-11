# Sellora — Digital Catalogues. Smarter Sales.

Sellora is a self-service B2B catalogue platform. Businesses create an account, describe what they sell, manage industry-specific product records, build a catalogue and publish a shareable customer-facing link.

## Phase 1–6 MVP in this branch

1. Authentication: email/password sign-up and login, Node.js scrypt password hashes and signed seven-day bearer tokens.
2. Business onboarding: business name, category, business model, contact details and brand colour; starter field templates for yarn/textiles, clothing, furniture, electronics and other products.
3. Business workspace: overview, setup checklist, product and catalogue counts.
4. Generic product library: SKU, description, optional price, currency, unit, image URL and industry-specific fields.
5. Catalogue builder: create catalogues and choose which business-owned products they contain.
6. Publish/share: publish or unpublish and share a public route at /c/:slug.
7. Selling preferences and payments: business owners can switch between catalogue-only and catalogue + online payments from Settings. Razorpay credentials are encrypted; checkout verifies payment signatures, webhooks reconcile asynchronous events idempotently, and verified payment timestamps power reports.
8. Customer operations: public product enquiries are saved per business and managed in the Enquiries page; the customer directory combines enquiries and catalogue orders.
9. Inventory: stock can be enabled and adjusted per product, stock movements are audited, and checkout reserves available stock atomically. Cancellation and confirmed refunds return reserved stock.
10. Operations: the dashboard includes customer order detail editing, fulfilment status controls, full Razorpay refunds for verified paid catalogue orders, date-filtered reports, and product image upload/removal.

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

5. Apply migrations and seed reference data. Before seeding, set `PLATFORM_OWNER_EMAIL` to your own email and `PLATFORM_OWNER_PASSWORD` to a unique password of at least 12 characters in `.env`:

   npm run db:migrate
   npm run db:seed

The seed creates the PixelForge platform-owner account and workspace. It will not automatically promote an existing non-owner account.

6. Start the apps:

   npm run dev

7. Open http://localhost:5173. API health check: http://localhost:4000/api/health.

For an existing development database, back it up before applying the new migration. The migration adds nullable business ownership and generic product/catalogue tables; it does not delete yarn tables.

## Main API routes

- POST /api/auth/signup, POST /api/auth/login, GET /api/auth/me, PATCH /api/auth/password, POST /api/auth/password/forgot, POST /api/auth/password/reset
- GET /api/workspace/business, POST /api/workspace/business
- GET/POST /api/workspace/products, PATCH/DELETE /api/workspace/products/:id, POST /api/workspace/products/:id/image
- GET /api/workspace/enquiries, PATCH /api/workspace/enquiries/:id; POST /api/public/catalogues/:slug/enquiries
- GET /api/workspace/inventory, POST /api/workspace/inventory/:productId/adjust
- GET /api/workspace/customers, GET /api/workspace/reports
- PATCH /api/workspace/orders/:id, PATCH /api/workspace/orders/:id/status, POST /api/workspace/orders/:id/refund
- GET/POST /api/workspace/catalogues, PATCH /api/workspace/catalogues/:id
- GET /api/public/catalogues/:slug
- PATCH /api/workspace/business/settings (authenticated; accepts `sellingMode: CATALOG_ONLY | ONLINE_PAYMENTS`)
- GET /api/health

Workspace routes require Authorization: Bearer <token>. Product and catalogue operations scope records to the signed-in user's business. Public catalogue routes expose only published catalogues.

## Razorpay setup

1. Configure `PAYMENT_ENCRYPTION_KEY` once in the Sellora API host environment as a unique 64-character hexadecimal key. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep it outside the repository and back it up securely; losing it makes saved credentials unreadable. Existing deployments with `RAZORPAY_ENCRYPTION_KEY` can use it as a fallback. This is a Sellora-managed server secret, not a value customers enter.
2. Apply the included migration with `npm run db:migrate` after configuring `DATABASE_URL`. Test it against a backed-up staging database before production deployment. For a disposable development database, `npx prisma db push --schema apps/api/prisma/schema.prisma` is also available.
3. Business customers enter their own Razorpay Key ID and Key Secret in Sellora Settings. Start with test credentials; Sellora checks the credentials with Razorpay before connecting.
4. Only the PixelForge platform owner sees the platform webhook endpoint in Settings. Set `PUBLIC_API_URL` to the public API origin (without `/api`) so the owner panel can display the complete endpoint. Configure it in the relevant Razorpay Dashboard and subscribe to `payment.captured`, `payment.failed` and `order.paid`. Each business's own webhook secret remains a separate tenant-level setting.
5. Only fixed-price products in published catalogues can be purchased online. The API calculates the amount from the saved product price and verifies Razorpay's signature and payment details before marking an order paid.

## Production hardening still required

This is an MVP foundation, not a production launch approval.

- Set a strong, unique AUTH_SECRET; never use the development fallback in production.
- Add rate limiting, email verification, session revocation and abuse controls. Password recovery email delivery uses Resend and requires RESEND_API_KEY plus a verified MAIL_FROM sender.
- Restrict or remove legacy unauthenticated admin endpoints in apps/api/src/index.ts before public deployment.
- Add broader automated API/browser tests, including payment-webhook signature/idempotency tests, stock-concurrency tests and cross-tenant authorization tests.
- Product images are stored on the API filesystem; production must mount a persistent volume at UPLOAD_DIR and configure PUBLIC_API_URL. Object storage/CDN integration and image lifecycle cleanup for all deployment topologies remain future hardening.
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
