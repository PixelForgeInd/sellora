# Code standards

These conventions apply to the Sellora monorepo and should be followed for new code and touched files.

## TypeScript and React

- Prefer TypeScript types for API payloads, component props, and shared domain models.
- Use named exports for reusable modules and components; keep default exports for application entry points where already established.
- Keep React components focused. Move reusable UI into `components/`, domain types into `sellora/types.ts`, API access into `sellora/api-client.ts`, and display formatting into dedicated helpers.
- Keep API calls out of presentation components where practical.
- Use descriptive names and consistent camelCase for variables/functions and PascalCase for React components/types.
- Avoid introducing `any`; use explicit types or generics when changing existing untyped API boundaries.
- Use stable keys for mapped React elements and accessible labels for interactive controls.
- Do not mix unrelated concerns in a single component or module.

## API and data

- Validate untrusted request data at API boundaries with Zod.
- Keep authorization checks on protected routes and calculate prices/totals on the server.
- Do not expose secrets or trust client-supplied ownership, price, or status values.
- Keep Prisma schema changes and migrations in sync; never silently rewrite existing yarn/business data.

## Formatting and maintainability

- Use two spaces for indentation, LF line endings, UTF-8, and a final newline (see `.editorconfig`).
- Prefer small, readable functions and one statement per line.
- Avoid unrelated changes in a feature PR.
- Update documentation when behavior or setup changes.

## Pull request quality gate

Before merging, run:

```bash
npm install
npm run db:generate
npm run build
```

For database changes, review the migration and test against a disposable/local database first. A successful TypeScript/Vite build is necessary but does not replace functional testing.

## Refactoring rule

Refactor incrementally: preserve behavior, extract one concern at a time, and verify the build after each logical batch. Do not combine cart/checkout feature work with general cleanup.
