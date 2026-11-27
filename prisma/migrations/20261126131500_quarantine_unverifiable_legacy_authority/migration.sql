-- Preserve legacy records, but prevent unverifiable historical authority from
-- remaining active. No evidence, profile or authorization rows are deleted.
UPDATE "professional_profiles" p
SET "credentialStatus" = 'PENDING',
    "credentialVerifiedAt" = NULL,
    "credentialReviewerId" = NULL,
    "credentialReviewNotes" = 'Legacy verification quarantined: no valid credential review history was recorded.'
WHERE p."credentialStatus" = 'VERIFIED'
  AND NOT EXISTS (
    SELECT 1 FROM "professional_credential_reviews" r
    WHERE r."professionalProfileId" = p.id AND r.decision = 'VERIFIED'
  );

UPDATE "professional_authorizations" a
SET status = 'SUSPENDED',
    "revocationReason" = 'Legacy authorization quarantined: no authorization decision history was recorded.'
WHERE a.status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM "professional_authorization_decisions" d
    WHERE d."authorizationId" = a.id AND d.decision = 'AUTHORIZED'
  );
