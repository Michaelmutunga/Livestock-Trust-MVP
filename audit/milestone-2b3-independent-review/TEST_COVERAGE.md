# Test coverage

## Safe checks executed for preparation

- `npx prisma validate` — completed without reported validation errors.
- `npx prisma migrate status` / direct `_prisma_migrations` inspection — ten migrations recorded, none rolled back.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run test:architecture` — passed.

## Existing mutation-oriented tests inspected but not run

- `npm run db:test:hardening` — creates, updates and deletes fictional records.
- `npm run db:test:integrity` — performs direct SQL updates and cleanup.
- `node scripts/test-consent-authorization.js` — creates and deletes protected fixtures.
- `node scripts/test-db.js` — creates and deletes identity/tenancy fixtures.

They were skipped under the audit-preparation read-only restriction.

## What the inspected tests cover

The hardening test covers forged-context rejection, consent service authorization, exact/null scope mismatches, expiry/revocation, concurrent revisions, private-contact access, evidence privacy, credential invalidation, animal-scope denial, authorization lifecycle and cross-cooperative denial.

The direct integrity test covers legacy-consent denial, direct terminal-revocation updates, direct scope mutation, direct animal-scope insertion, direct verified-profile insertion, inactive actor reuse and direct active-authorization insertion.

The architecture test scans `src/` for Prisma and actor-boundary imports outside approved modules.

## Gaps

- No real Auth.js/session integration test exists.
- No production server action, background job or API route exists to test end-to-end.
- Regression tests directly create protected records, so they do not alone prove that production callers are forced through services.
- External farmer agreement and professional credential verification are outside the repository.
