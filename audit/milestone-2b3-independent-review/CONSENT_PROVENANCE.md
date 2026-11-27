# Consent provenance and lifecycle

## Captured fields

`FarmerConsent` and `ConsentRevision` distinguish:

- provider type: farmer or representative;
- provider name and linked farmer/user where applicable;
- representative authority evidence;
- capture method and timestamp;
- capturing user;
- evidence/attestation reference;
- purpose;
- scope and target;
- capture notes;
- provenance status.

The capture service requires a field officer with an active cooperative role and active farmer membership. Administrator authority alone cannot create consent through the service.

The system records provenance; it does not establish legal sufficiency or independently verify that the farmer actually agreed.

## Legacy quarantine

Existing consent rows are marked `LEGACY_UNVERIFIED`. `createConsentAccessGrant()` and `getEligibleConsentGrant()` require `VERIFIED` provenance, so an active legacy consent cannot create a new grant or authorize protected access.

Existing rows and grants are retained. Legacy professional authority without verifiable review/decision history is quarantined rather than deleted.

## Lifecycle controls

- Revoked consent is terminal at the service and database layers.
- Revoked grants are terminal at the database layer.
- Farmer, cooperative, scope type and scope reference are immutable by trigger.
- Scope changes require a new consent ID.
- Revisions use serializable transactions and preserve historical grants/revisions.
- Exact nullable scope matching remains protected by the earlier trigger and composite foreign key.

## Review caveat

Field-officer capture metadata is not independent proof of farmer agreement. Representative authority evidence is stored as application data and requires operational/legal validation outside this milestone.
