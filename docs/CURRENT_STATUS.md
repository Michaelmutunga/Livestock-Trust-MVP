# Current status

Snapshot date: 2026-11-27

## Implementation state

Milestones 1 through 2C.1 are implemented locally. The worktree has not been committed or pushed. Authentication, Auth.js adapter tables, ownership and later business domain modules remain unimplemented.

## Implemented

- Next.js App Router TypeScript foundation.
- Basic home page and global styles.
- PostgreSQL 16 Alpine Compose service with named volume and health check.
- `.env.example` placeholders and secret-safe `.gitignore` rules.
- Initial AI agent and architecture documentation.
- Prisma 6.19.0 and `@prisma/client` 6.19.0.
- Core identity and tenancy models: User, Party, Cooperative, Farmer, FarmerPrivateContact, FarmerCooperativeMembership, FarmerUserLink, and RoleAssignment.
- Prisma migration `20261126085031_init_identity_tenancy`.
- Fictional development seed script.
- Database tests for membership uniqueness and cooperative role scoping.
- Consent and professional authorization models with reviewed database constraints.
- Consent revision and revocation history.
- Professional credential evidence and manual review state.
- Scoped professional authorization with cooperative/farmer/animal reference shape checks.
- Focused Milestone 2B database test suite.
- Centralized deny-by-default authorization policies and consent/professional authorization services under `src/lib/authz/`.
- Credential review and authorization decision history models.
- Database hardening migration `20261126093000_authorization_integrity_hardening`.
- Exact-scope trigger migrations `20261126094500_exact_consent_scope_guard` and `20261126095000_fix_exact_consent_scope_guard` (the latter corrects quoted PostgreSQL record fields; both are create-only and preserve rows).
- Database constraints preventing administrative access grants, mismatched consent scopes, parent-authorization scope mismatches, and duplicate active scopes.
- Runtime-issued actor capability resolution and protected data-access services.
- Consent capture provenance migration `20261126110000_consent_capture_provenance`.
- Terminal consent revocation, immutable consent scope identity, serializable revisions, and pre-Animal animal-authorization rejection.
- Explicit consent provider/representative provenance and `LEGACY_UNVERIFIED` quarantine.
- Database triggers for terminal revocation, immutable consent identity, deferred animal scopes, credential review integrity and active authorization decisions.
- Legacy authority quarantine migration `20261126131500_quarantine_unverifiable_legacy_authority` preserved unverifiable profiles/authorizations while removing their active authority.
- History-retention migration `20261126134500_protect_authority_history` prevents deleting review/decision history while authority remains active.
- Direct SQL integrity test suite and architecture import-boundary test.
- Animal, AnimalIdentifier and CooperativeAnimalLink models with migration `20261127100000_animal_identity_and_cooperative_links`.
- Active identifier uniqueness, immutable identifier identity, historical retirement, cooperative-link tenant membership checks, and a foreign key for deferred animal professional scopes.
- Milestone 2C.1 actor resolver rejects all caller-provided principals until a real authentication adapter exists; protected professional authorization rechecks current user status.
- Consent provider identity/provenance and consent revisions are append-only; `LEGACY_UNVERIFIED` cannot be upgraded in place.
- Credential review and authorization decision rows reject updates and deletes.
- Animal identifiers reject identity edits, reactivation and deletion. External IDs may be reused after retirement; Livestock Trust internal references remain globally unique after retirement.
- Cooperative animal links reject identity changes, reactivation and deletion; active membership-backed links require an active membership.
- Database scope shape rejects `ANIMAL` professional authorization while retaining the animal foreign key and cooperative/membership composite relationship.

## Implemented and tested

- Repository path, Git remote, branch, and initial state inspected.
- Node.js 22.13.0 and Docker 28.5.1 detected.
- `npm install` completed and generated `package-lock.json`.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `docker compose config` passed.
- PostgreSQL started healthy on host port 5433 because host port 5432 was already occupied.
- `pg_isready` and SQL connectivity passed.
- A temporary table survived container restart.
- Backup and restore passed into a separate temporary database.
- Next.js dev server returned HTTP 200 on port 3001 because host port 3000 was already occupied.
- Prisma schema validation passed.
- Migration deployment passed against the empty `livestock_trust` database.
- The target database had no application tables or rows before migration; existing unrelated PostgreSQL containers and volumes were not modified.
- Fictional seed counts verified in PostgreSQL.
- TypeScript and ESLint passed after Prisma integration.
- Milestone 2B migration deployed without resetting the database.
- Consent, revision, revocation, expiry, unauthorized-access, credential-review, authorization-revocation, and invalid-scope tests passed.
- Milestone 2A tests passed after the Milestone 2B migration.
- Original fictional Milestone 2A seed counts remained intact after test cleanup.
- Milestone 2B.1 hardening tests passed: exact consent scope, cross-cooperative denial, expiry, atomic revocation, credential-review gating, authorization lifecycle, invalid scopes, duplicate scopes, and privacy boundary checks.
- Milestone 2C.1 migrations `20261127120000_m2c1_historical_integrity` and `20261127130000_preserve_consent_revision_history` deployed incrementally; all 13 migrations report up to date.
- Prisma format, validation, client generation, TypeScript and architecture boundary checks passed.
- `db:test:animals`, `db:test:integrity`, `db:test:m2c1`, Milestone 2A `scripts/test-db.js`, and `db:test:consent` passed against the Livestock Trust database on port 5433. Append-only test fixtures are retained.

## Not yet tested in this environment

- The first npm attempts failed with EPERM while accessing the user cache; a bounded retry using the existing cache completed successfully.

## Known issues

- GitHub remote authentication is unavailable in the current environment.
- Host port 5432 is occupied by the unrelated `kbf-platform-db-1` container.
- Host port 3000 is occupied by the unrelated `kbf-platform-frontend-1` container.
- Next.js warned about an unrelated lockfile at `C:\Users\808ni\package-lock.json`; it did not prevent startup.
- npm reported that Next.js 15.5.7 has a published security warning. The approved stack version was retained for this milestone.
- Auth.js adapter tables do not exist by design.
- Ownership, custody/location history, veterinary, breeding, milk, intervention, audit, and revision modules are not implemented.
- The trusted actor context is an explicit boundary for future authentication; no current code can issue it, and no request route creates or consumes it.
- `ProfessionalAuthorizationScope.animalId` retains its foreign key, while database scope checks and application policy reject animal authorization.
- Two fictional consent fixtures and one fictional professional profile from earlier Milestone 2B testing remain in the development database; they were not deleted during this hardening work.
- Authentication is still not implemented. The actor resolver rejects all principals until a real authentication adapter is connected.
- `db:test:hardening` fails at the intentionally unavailable auth boundary because it depended on caller-supplied test actors; its service-level integration checks remain outstanding until a real adapter exists.
- `npm run lint` failed: ESLint traversed generated `.next` output and reported generated-code/CommonJS import and Next declaration errors. Lint is not recorded as passing.
- No database reset was run. Only the two new incremental migrations were deployed; no existing application rows were deleted by migration or test cleanup. The consent authorization suite retains its fictional test graph because it contains append-only history.
- No Git mutation was performed; changes remain uncommitted.
- A real authentication provider remains required before production user-facing authorization readiness can be claimed.

## Immediate next action

Independent review of Milestone 2C.1. Ownership evidence and transfer history require separate approval.
