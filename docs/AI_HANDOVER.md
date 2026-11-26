# AI handover

## Verified state

As of 2026-11-26, Milestone 1, Milestone 2A, Milestone 2B, and Milestone 2B.1 created the Next.js foundation, PostgreSQL Compose configuration, Prisma foundation, core identity/tenancy schema, consent/access grants, professional authorization schema, and authorization-integrity hardening. The repository has no commit yet. Authentication and later business domain modules remain unimplemented.

## Stack and dependencies

Declared and installed: Next.js 15.5.7, React 19.1.0, React DOM 19.1.0, TypeScript 5.7.2, ESLint 9.17.0, `eslint-config-next` 15.5.7, Prisma 6.19.0, and `@prisma/client` 6.19.0. Node.js 22.13.0 was detected locally. `package-lock.json` was generated.

## Important files

- `package.json`: scripts and dependencies.
- `src/app/`: minimal App Router application.
- `docker-compose.yml`: PostgreSQL service, named volume, and health check.
- `.env.example`: placeholder development configuration.
- `AGENTS.md`: agent instructions.
- `docs/DECISIONS.md`: canonical architecture decisions.
- `docs/CURRENT_STATUS.md`: verified implementation snapshot.
- `prisma/schema.prisma`: implemented core identity and tenancy models.
- `prisma/migrations/20261126085031_init_identity_tenancy/migration.sql`: applied first migration.
- `prisma/seed.js`: fictional development seed.
- `scripts/test-db.js`: membership uniqueness and cooperative role-scoping tests.
- `scripts/test-consent-authorization.js`: consent and professional authorization tests.
- `src/lib/authz/`: trusted actor boundary, deny-by-default policies, and transactional consent/professional authorization services.
- `scripts/test-authz-hardening.ts`: hardening tests for authorization decisions and database integrity.
- `prisma/migrations/20261126093000_authorization_integrity_hardening/migration.sql`: reviewed incremental integrity migration.
- `prisma/migrations/20261126094500_exact_consent_scope_guard/migration.sql` and `20261126095000_fix_exact_consent_scope_guard/migration.sql`: exact-scope trigger guard (including nullable references).

## Business rules

Farmers may belong to multiple cooperatives, but animal ownership is independent of membership. Ownership, evidence, cooperative association, and authorization are separate. Independent veterinarians require explicit scoped authorization; cooperative accounts do not establish professional qualification. Important records preserve provenance and correction history.

## Commands

`npm install`, `docker compose up -d postgres`, `npm run typecheck`, `npm run lint`, and `npm run dev`.

## Actual checks and limitations

Git status and remote configuration were inspected. Node.js 22.13.0 and Docker 28.5.1 were detected. Prisma validation, all three migration deployments, fictional seed, database connectivity, consent/revocation/expiry, unauthorized-access, credential-review, authorization-revocation, invalid-scope, hardening decision tests, membership uniqueness, cooperative role scoping, TypeScript, and lint all passed. PostgreSQL used host port 5433 because 5432 was occupied by an unrelated service.

The target database was empty before migration. The unrelated `kbf-platform-db-1` PostgreSQL container and its data were not changed.

## Exact next task

After Milestone 2B.1 review and separate approval, begin the next controlled phase: animal identity and cooperative animal links. Do not add ownership, veterinary, breeding, milk, intervention, audit, or Auth.js adapter modules before approval.

## Files requiring care

Do not change `.git`, force-push, overwrite remote history, or commit secrets. Do not change Docker Desktop's storage location. Do not begin authentication, business workflows, or the Prisma schema without the approved next milestone.
