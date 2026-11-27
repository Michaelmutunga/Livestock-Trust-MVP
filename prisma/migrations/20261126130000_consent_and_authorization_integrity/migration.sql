CREATE TYPE "ConsentProvenanceStatus" AS ENUM ('VERIFIED', 'LEGACY_UNVERIFIED');
CREATE TYPE "ConsentProviderType" AS ENUM ('FARMER', 'REPRESENTATIVE');

ALTER TABLE "farmer_consents"
  ADD COLUMN "consentProviderType" "ConsentProviderType",
  ADD COLUMN "consentProviderName" TEXT,
  ADD COLUMN "consentProviderFarmerId" TEXT,
  ADD COLUMN "consentProviderUserId" TEXT,
  ADD COLUMN "representativeAuthorityEvidence" TEXT,
  ADD COLUMN "evidenceReference" TEXT,
  ADD COLUMN "purpose" TEXT,
  ADD COLUMN "provenanceStatus" "ConsentProvenanceStatus";

UPDATE "farmer_consents"
SET "consentProviderType" = 'FARMER',
    "consentProviderName" = 'Legacy unknown provider',
    "consentProviderFarmerId" = "farmerId",
    "purpose" = 'Legacy record; purpose was not captured.',
    "provenanceStatus" = 'LEGACY_UNVERIFIED'
WHERE "provenanceStatus" IS NULL;

ALTER TABLE "farmer_consents"
  ALTER COLUMN "consentProviderType" SET NOT NULL,
  ALTER COLUMN "consentProviderName" SET NOT NULL,
  ALTER COLUMN "purpose" SET NOT NULL,
  ALTER COLUMN "provenanceStatus" SET NOT NULL;

ALTER TABLE "consent_revisions"
  ADD COLUMN "consentProviderType" "ConsentProviderType",
  ADD COLUMN "consentProviderName" TEXT,
  ADD COLUMN "consentProviderFarmerId" TEXT,
  ADD COLUMN "consentProviderUserId" TEXT,
  ADD COLUMN "representativeAuthorityEvidence" TEXT,
  ADD COLUMN "evidenceReference" TEXT,
  ADD COLUMN "purpose" TEXT,
  ADD COLUMN "provenanceStatus" "ConsentProvenanceStatus";

UPDATE "consent_revisions" r
SET "consentProviderType" = c."consentProviderType",
    "consentProviderName" = c."consentProviderName",
    "consentProviderFarmerId" = c."consentProviderFarmerId",
    "purpose" = c."purpose",
    "provenanceStatus" = c."provenanceStatus"
FROM "farmer_consents" c
WHERE r."consentId" = c.id;

ALTER TABLE "consent_revisions"
  ALTER COLUMN "consentProviderType" SET NOT NULL,
  ALTER COLUMN "consentProviderName" SET NOT NULL,
  ALTER COLUMN "purpose" SET NOT NULL,
  ALTER COLUMN "provenanceStatus" SET NOT NULL;

ALTER TABLE "farmer_consents"
  ADD CONSTRAINT "farmer_consents_provider_shape"
  CHECK (("consentProviderType" = 'FARMER' AND "consentProviderFarmerId" = "farmerId" AND "consentProviderUserId" IS NULL AND "representativeAuthorityEvidence" IS NULL) OR ("consentProviderType" = 'REPRESENTATIVE' AND "consentProviderFarmerId" IS NULL AND "consentProviderUserId" IS NOT NULL AND length(btrim("representativeAuthorityEvidence")) > 0));
ALTER TABLE "consent_revisions"
  ADD CONSTRAINT "consent_revisions_provider_shape"
  CHECK (("consentProviderType" = 'FARMER' AND "consentProviderFarmerId" IS NOT NULL AND "consentProviderUserId" IS NULL AND "representativeAuthorityEvidence" IS NULL) OR ("consentProviderType" = 'REPRESENTATIVE' AND "consentProviderFarmerId" IS NULL AND "consentProviderUserId" IS NOT NULL AND length(btrim("representativeAuthorityEvidence")) > 0));

ALTER TABLE "farmer_consents"
  ADD CONSTRAINT "farmer_consents_provider_farmer_fk" FOREIGN KEY ("consentProviderFarmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "farmer_consents_provider_user_fk" FOREIGN KEY ("consentProviderUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consent_revisions"
  ADD CONSTRAINT "consent_revisions_provider_farmer_fk" FOREIGN KEY ("consentProviderFarmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "consent_revisions_provider_user_fk" FOREIGN KEY ("consentProviderUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_consent_identity_or_revocation_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."farmerId" IS DISTINCT FROM NEW."farmerId" OR OLD."recipientCooperativeId" IS DISTINCT FROM NEW."recipientCooperativeId" OR OLD."scopeType" IS DISTINCT FROM NEW."scopeType" OR OLD."scopeReferenceId" IS DISTINCT FROM NEW."scopeReferenceId" THEN
    RAISE EXCEPTION 'Consent identity fields are immutable';
  END IF;
  IF OLD."consentStatus" = 'REVOKED' OR OLD."revokedAt" IS NOT NULL THEN
    IF NEW."consentStatus" <> OLD."consentStatus" OR NEW."revokedAt" IS NULL THEN
      RAISE EXCEPTION 'Consent revocation is terminal';
    END IF;
  END IF;
  IF NEW."consentStatus" = 'REVOKED' AND NEW."revokedAt" IS NULL THEN
    RAISE EXCEPTION 'Revoked consent requires revokedAt';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER farmer_consents_immutable_identity_trigger BEFORE UPDATE ON "farmer_consents" FOR EACH ROW EXECUTE FUNCTION prevent_consent_identity_or_revocation_change();

CREATE OR REPLACE FUNCTION prevent_grant_reactivation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" = 'REVOKED' OR OLD."revokedAt" IS NOT NULL THEN
    IF NEW."status" <> OLD."status" OR NEW."revokedAt" IS NULL THEN
      RAISE EXCEPTION 'Grant revocation is terminal';
    END IF;
  END IF;
  IF NEW."status" = 'REVOKED' AND NEW."revokedAt" IS NULL THEN
    RAISE EXCEPTION 'Revoked grant requires revokedAt';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER record_access_grants_terminal_revocation_trigger BEFORE UPDATE ON "record_access_grants" FOR EACH ROW EXECUTE FUNCTION prevent_grant_reactivation();

ALTER TABLE "professional_authorization_scopes" ADD CONSTRAINT "professional_authorization_scope_animal_deferred" CHECK ("scopeType" <> 'ANIMAL');

CREATE OR REPLACE FUNCTION require_credential_review_integrity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."status" = 'ACCEPTED' THEN
    IF NEW."reviewedByUserId" IS NULL OR NEW."reviewedAt" IS NULL OR NOT EXISTS (SELECT 1 FROM "role_assignments" r WHERE r."userId" = NEW."reviewedByUserId" AND r."role" = 'SYSTEM_ADMINISTRATOR' AND r."cooperativeId" IS NULL AND r."revokedAt" IS NULL) THEN
      RAISE EXCEPTION 'Accepted credential evidence requires an active system administrator reviewer';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER credential_evidence_integrity_trigger BEFORE INSERT OR UPDATE ON "professional_credential_evidence" FOR EACH ROW EXECUTE FUNCTION require_credential_review_integrity();

CREATE OR REPLACE FUNCTION require_verified_profile_integrity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."credentialStatus" = 'VERIFIED' AND NOT EXISTS (SELECT 1 FROM "professional_credential_reviews" r WHERE r."professionalProfileId" = NEW.id AND r."decision" = 'VERIFIED' AND EXISTS (SELECT 1 FROM "role_assignments" a WHERE a."userId" = r."reviewerUserId" AND a."role" = 'SYSTEM_ADMINISTRATOR' AND a."cooperativeId" IS NULL AND a."revokedAt" IS NULL)) THEN
    RAISE EXCEPTION 'Verified professional profile requires a valid credential review';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER professional_profile_integrity_trigger BEFORE INSERT OR UPDATE ON "professional_profiles" FOR EACH ROW EXECUTE FUNCTION require_verified_profile_integrity();

CREATE OR REPLACE FUNCTION require_active_authorization_decision()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM "professional_authorization_decisions" d WHERE d."authorizationId" = NEW.id AND d."decision" = 'AUTHORIZED' AND EXISTS (SELECT 1 FROM "role_assignments" a WHERE a."userId" = d."actorUserId" AND a."revokedAt" IS NULL AND ((a."role" = 'SYSTEM_ADMINISTRATOR' AND a."cooperativeId" IS NULL) OR (a."role" = 'COOPERATIVE_ADMINISTRATOR' AND a."cooperativeId" = NEW."cooperativeId")))) THEN
    RAISE EXCEPTION 'Active professional authorization requires a valid authorization decision';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER professional_authorization_integrity_trigger BEFORE INSERT OR UPDATE ON "professional_authorizations" FOR EACH ROW EXECUTE FUNCTION require_active_authorization_decision();
