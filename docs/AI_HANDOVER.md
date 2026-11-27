# AI handover

## Verified state

As of 2026-11-27, Milestones 1 through 2C.1 are implemented locally. Milestone 2C.1 adds incremental protections for consent and authorization history, animal identifier/link history, and database rejection of animal professional scopes. Authentication and later business domain modules remain unimplemented. Current work is uncommitted; no Git mutations were performed during Milestone 2C.1.

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
- `src/lib/authz/auth-boundary.ts`: designated future authentication-adapter boundary; no production provider is connected.
- `scripts/test-authz-hardening.ts`: hardening tests for authorization decisions and database integrity.
- `prisma/migrations/20261126093000_authorization_integrity_hardening/migration.sql`: reviewed incremental integrity migration.
- `prisma/migrations/20261126094500_exact_consent_scope_guard/migration.sql` and `20261126095000_fix_exact_consent_scope_guard/migration.sql`: exact-scope trigger guard (including nullable references).
- `prisma/migrations/20261126110000_consent_capture_provenance/migration.sql`: consent capture actor and notes, backfilled without deleting records.
- `prisma/migrations/20261126130000_consent_and_authorization_integrity/migration.sql`: provider provenance, legacy quarantine, terminal revocation, immutable identity, deferred animal scopes and professional review/decision triggers.
- `prisma/migrations/20261126131500_quarantine_unverifiable_legacy_authority/migration.sql`: preserves but deactivates legacy authority without review/decision history.
- `prisma/migrations/20261126134500_protect_authority_history/migration.sql`: retains required review and authorization decision history while authority is active.
- `prisma/migrations/20261127120000_m2c1_historical_integrity/migration.sql` and `20261127130000_preserve_consent_revision_history/migration.sql`: Milestone 2C.1 incremental protections.
- `scripts/test-m2c1-integrity.ts`: direct database tests for provenance, append-only history, unavailable actor issuance and disabled animal scopes.
- `scripts/test-db-integrity-b23.ts` and `scripts/test-architecture-b23.js`: direct SQL integrity and import-boundary tests.
- `src/lib/authz/protected-data-service.ts`: approved reads for private contacts, consent/grant records, credential evidence and professional authorizations.

## Business rules

Farmers may belong to multiple cooperatives, but animal ownership is independent of membership. Ownership, evidence, cooperative association, and authorization are separate. Independent veterinarians require explicit scoped authorization; cooperative accounts do not establish professional qualification. Important records preserve provenance and correction history.

## Commands

`npm install`, `docker compose up -d postgres`, `npm run typecheck`, `npm run lint`, and `npm run dev`.

## Actual checks and limitations

Git status and remote configuration were inspected. Node.js 22.13.0 and Docker 28.5.1 were detected. Prisma validation, all three migration deployments, fictional seed, database connectivity, consent/revocation/expiry, unauthorized-access, credential-review, authorization-revocation, invalid-scope, hardening decision tests, membership uniqueness, cooperative role scoping, TypeScript, and lint all passed. PostgreSQL used host port 5433 because 5432 was occupied by an unrelated service.

The target database was empty before the initial migration. Milestone 2C.1 deployed only incremental migrations to the existing Livestock Trust database. The unrelated `kbf-platform-db-1` PostgreSQL container and its data were not changed.

## Exact next task

The exact next task is independent review of Milestone 2C.1. Ownership claims/evidence/transfers require separate approval. Do not add custody/location, veterinary, breeding, milk, intervention, audit, or Auth.js adapter modules before approval. A real authentication provider must be connected before production user-facing authorization is claimed.

Authentication is unavailable: `resolveTrustedActor` rejects all inputs until a real adapter is implemented. Animal authorization is rejected in application policy and by database constraint. Milestone 2C.1 database, consent authorization, animal, direct integrity and Milestone 2A DB regression tests passed; `db:test:hardening` still assumes caller-created test actors and fails at the unavailable auth boundary, so its service integration checks remain outstanding. All 13 migrations are applied. No existing application rows were deleted by this milestone; append-only test history fixtures were retained. Prisma format, validation, generation, typecheck and architecture checks passed. `npm run lint` failed because ESLint traversed generated `.next` files and found generated-code/CommonJS import and Next declaration errors.

## Files requiring care

Do not change `.git`, force-push, overwrite remote history, or commit secrets. Do not change Docker Desktop's storage location. Do not begin authentication, business workflows, or the Prisma schema without the approved next milestone.
