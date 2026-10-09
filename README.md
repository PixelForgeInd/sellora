# Ganeshaa Sutra Sales Catalogue — V1.0 starter

A monorepo starter for a yarn-trading sales catalogue with public product prices, an admin API foundation, and an interactive PDF flipbook viewer.

## Stack
- Node.js 22 LTS
- React + TypeScript + Vite
- Express 5
- PostgreSQL + Prisma ORM
- Tailwind CSS 4
- `react-pageflip` for page-turn animation
- PDF.js for PDF page rendering

> Dependency versions are pinned to compatible version ranges. Before production, verify package compatibility and commit the generated lockfile.

## Prerequisites
- Node.js 22+
- npm 10+
- PostgreSQL 17+

## Setup
1. Copy `.env.example` to `.env` and update `DATABASE_URL`.
2. Create a PostgreSQL database named `ganeshaa_sutra_sales`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Generate Prisma Client and create tables:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```
5. Start the API and web app:
   ```bash
   npm run dev
   ```
6. Open the frontend at `http://localhost:5173`. API health check: `http://localhost:4000/api/health`.

## Current implementation
- Public product catalogue from API/database
- Search by product name, count, yarn type and shade
- Public INR price display with unit
- PDF upload endpoint and browser-based flipbook preview
- Admin product create/update API foundation
- Customer enquiry submission and admin enquiry list/status API
- Prisma schema and starter seed data

## Important next steps before production
- Implement secure administrator authentication and role-based access control before exposing admin endpoints publicly.
- Move uploaded PDFs/images to persistent object storage for production.
- Add file malware scanning, strict upload limits, rate limiting and production logging.
- Configure HTTPS, CORS, secrets and database backups.
- Add automated API/UI tests.
- Do not use the seeded example prices as real selling prices; replace them with verified Ganeshaa Sutra prices.

## Project structure
```
apps/
  api/
    prisma/
    src/
  web/
    src/
```

## API endpoints
- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (development/admin foundation; protect before production)
- `PATCH /api/products/:id` (development/admin foundation; protect before production)
- `POST /api/catalogues/upload`
- `POST /api/enquiries`
- `GET /api/enquiries` (development/admin foundation; protect before production)
- `PATCH /api/enquiries/:id/status` (development/admin foundation; protect before production)
# sellora
# sellora
