# Implementation inventory

## Trusted actor creation and validation

- `src/lib/authz/auth-boundary.ts`
  - `VerifiedAuthPrincipal`
  - `resolveTrustedActor()` validates issuer/subject/session/expiry shape, loads an active user, and issues a frozen context stored in a module-private `WeakSet`.
  - `assertTrustedActorContext()` checks membership in that `WeakSet` and expiry.
- `src/lib/authz/context.ts`
  - `TrustedActorContext` type only; it does not issue capabilities.
- `src/lib/authz/policy.ts`
  - `activeUser()` / exported `assertActiveActor()` reload current user status.
  - `hasRole()` reloads active role assignments and cooperative scope.

Production source callers are not present. Test scripts call `resolveTrustedActor()` directly with fictional principals.

## Protected data-access services

- `src/lib/authz/protected-data-service.ts`
  - `getFarmerPrivateContact()` requires an exact eligible contact-details grant.
  - `getFarmerConsent()` and `getRecordAccessGrant()` require cooperative access.
  - `getProfessionalCredentialEvidence()` permits the profile owner or an active system administrator.
  - `getProfessionalAuthorization()` permits the professional owner or cooperative access.
- `src/lib/authz/consent-service.ts`
  - Consent creation, revision, grant creation and revocation.
- `src/lib/authz/professional-service.ts`
  - Credential review, professional authorization creation and revocation.
- `src/lib/db/client.ts`
  - Global Prisma singleton. It remains available to infrastructure and approved services.

## Direct Prisma access

Direct access appears in:

- `src/lib/db/client.ts` — infrastructure.
- `src/lib/authz/*.ts` — approved authorization/data-access modules.
- `scripts/test-db.js` — Milestone 2A test infrastructure.
- `scripts/test-consent-authorization.js` — regression fixture/test infrastructure; it directly writes protected records.
- `scripts/test-authz-hardening.ts` — integration test infrastructure; it directly creates fixtures and invokes services.
- `scripts/test-db-integrity-b23.ts` — direct SQL/database integrity test infrastructure.

No current `src/app` route or server action directly accesses Prisma. `scripts/test-architecture-b23.js` checks source imports, while ESLint restricts protected imports from `src/app`.

## Consent workflows

- `createConsent()` — field-officer capture, active farmer membership, explicit provider/provenance fields, revision 1.
- `reviseConsent()` — serializable transaction, immutable consent identity, active grant revocation, metadata revision.
- `revokeConsent()` — terminal database-protected revocation and active-grant revocation.
- `createConsentAccessGrant()` — only verified-provenance active consent can create a grant.
- `getEligibleConsentGrant()` — checks cooperative role, exact scope, provenance, status, dates and revocation.

## Professional workflows

- `reviewProfessionalCredentials()` — system administrator reviewer, evidence update and review history.
- `createProfessionalAuthorization()` — cooperative/system administrator, verified profile and accepted evidence; creates decision before activating authorization.
- `revokeProfessionalAuthorization()` — decision history and revocation state.
- Animal scopes are rejected by service, policy and database check until the Animal module exists.

## Database controls

Relevant raw objects are listed in `MIGRATION_HISTORY.md`. Prisma does not fully model all triggers, partial indexes or raw checks.
