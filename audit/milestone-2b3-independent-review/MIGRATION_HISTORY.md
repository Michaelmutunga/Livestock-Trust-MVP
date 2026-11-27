# Migration history and database controls

## Applied sequence

The live `_prisma_migrations` ledger contains these ten completed migrations, with no rollback entries:

1. `20261126085031_init_identity_tenancy`
2. `20261126090944_consent_professional_authorization`
3. `20261126093000_authorization_integrity_hardening`
4. `20261126094500_exact_consent_scope_guard`
5. `20261126095000_fix_exact_consent_scope_guard`
6. `20261126110000_consent_capture_provenance`
7. `20261126130000_consent_and_authorization_integrity`
8. `20261126131500_quarantine_unverifiable_legacy_authority`
9. `20261126133000_require_accepted_evidence_for_authority`
10. `20261126134500_protect_authority_history`

`20261126110000_consent_capture_provenance` existed on disk before the later B2.3 migrations and is recorded as applied before them. It is not part of the pushed B2.1 Git commits; the current working tree contains the later uncommitted milestone work, so Git history alone cannot establish its original authoring event. Its contents are unchanged during audit preparation.

## Controls introduced by B2.3

### `20261126110000_consent_capture_provenance`

Adds non-null capture actor and capture-note fields to consents and revisions, backfilling existing rows from creator metadata with explicit legacy notes.

### `20261126130000_consent_and_authorization_integrity`

Adds provider/provenance enums and fields, marks existing consent rows `LEGACY_UNVERIFIED`, adds provider-shape checks and foreign keys, and installs triggers for:

- immutable consent identity;
- terminal consent revocation;
- terminal grant revocation;
- deferred animal authorization scopes;
- accepted evidence reviewer authority;
- verified profile review integrity;
- active authorization decision integrity.

### `20261126131500_quarantine_unverifiable_legacy_authority`

Preserves records but moves unverifiable legacy verified profiles to `PENDING` and legacy active authorizations without decisions to `SUSPENDED`.

### `20261126133000_require_accepted_evidence_for_authority`

Strengthens verified-profile and active-authorization triggers to require accepted evidence.

### `20261126134500_protect_authority_history`

Prevents deleting credential-review history for verified profiles and authorization-decision history for active authorizations.

## Earlier controls

Earlier migrations provide exact consent-scope foreign keys, nullable-scope triggers, administrative-grant rejection, parent-authorization cooperative matching, partial logical-scope indexes, status/date checks and role-scope checks.

## Drift considerations

Raw triggers, trigger functions, partial unique indexes and several checks are migration-managed and are not fully represented in `prisma/schema.prisma`. Future Prisma migrations require SQL inspection to avoid drift.
