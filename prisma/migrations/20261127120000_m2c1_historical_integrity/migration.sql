-- Milestone 2C.1: preserve security provenance and append-only history.
-- Incremental only: existing rows are retained.

CREATE OR REPLACE FUNCTION guard_consent_provenance()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."provenanceStatus" = 'LEGACY_UNVERIFIED' AND NEW."provenanceStatus" <> OLD."provenanceStatus" THEN
    RAISE EXCEPTION 'legacy consent provenance cannot be upgraded in place';
  END IF;
  IF (NEW."consentProviderType", NEW."consentProviderName", NEW."consentProviderFarmerId", NEW."consentProviderUserId", NEW."representativeAuthorityEvidence", NEW."evidenceReference", NEW."purpose", NEW."provenanceStatus")
     IS DISTINCT FROM
     (OLD."consentProviderType", OLD."consentProviderName", OLD."consentProviderFarmerId", OLD."consentProviderUserId", OLD."representativeAuthorityEvidence", OLD."evidenceReference", OLD."purpose", OLD."provenanceStatus") THEN
    RAISE EXCEPTION 'consent provenance is immutable; capture a new consent identity';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER farmer_consents_provenance_guard BEFORE UPDATE ON "farmer_consents"
FOR EACH ROW EXECUTE FUNCTION guard_consent_provenance();


CREATE OR REPLACE FUNCTION reject_historical_rewrite()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% rows are append-only; add a correction record', TG_TABLE_NAME;
END;
$$;
CREATE TRIGGER professional_credential_reviews_append_only
BEFORE UPDATE OR DELETE ON "professional_credential_reviews"
FOR EACH ROW EXECUTE FUNCTION reject_historical_rewrite();
CREATE TRIGGER professional_authorization_decisions_append_only
BEFORE UPDATE OR DELETE ON "professional_authorization_decisions"
FOR EACH ROW EXECUTE FUNCTION reject_historical_rewrite();

DROP TRIGGER animal_identifier_history_guard ON "animal_identifiers";
CREATE OR REPLACE FUNCTION validate_animal_identifier_history() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'animal identifiers are historical and cannot be deleted'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW."animalId", NEW."identifierType", NEW."identifierValue", NEW."normalizedValue", NEW."issuedAt", NEW."createdByUserId", NEW."createdAt")
    IS DISTINCT FROM (OLD."animalId", OLD."identifierType", OLD."identifierValue", OLD."normalizedValue", OLD."issuedAt", OLD."createdByUserId", OLD."createdAt") THEN
    RAISE EXCEPTION 'animal identifier identity and provenance are immutable';
  END IF;
  IF OLD."retiredAt" IS NOT NULL AND NEW."retiredAt" IS DISTINCT FROM OLD."retiredAt" THEN
    RAISE EXCEPTION 'identifier retirement is terminal';
  END IF;
  IF NEW."retiredAt" IS NOT NULL AND NEW."retiredAt" < NEW."issuedAt" THEN
    RAISE EXCEPTION 'identifier cannot be retired before it was issued';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER animal_identifier_history_guard BEFORE UPDATE OR DELETE ON "animal_identifiers"
FOR EACH ROW EXECUTE FUNCTION validate_animal_identifier_history();

-- Internal references are Livestock Trust issued and never reusable. External IDs may
-- be reused only after retirement; active external namespace/value pairs remain unique.
DROP INDEX "animal_identifiers_active_unique";
CREATE UNIQUE INDEX "animal_identifiers_external_active_unique"
ON "animal_identifiers"("identifierType", "normalizedValue")
WHERE "identifierType" <> 'INTERNAL_REFERENCE' AND "retiredAt" IS NULL;
CREATE UNIQUE INDEX "animal_identifiers_internal_never_reuse"
ON "animal_identifiers"("identifierType", "normalizedValue")
WHERE "identifierType" = 'INTERNAL_REFERENCE';

DROP TRIGGER animal_link_history_guard ON "cooperative_animal_links";
CREATE OR REPLACE FUNCTION validate_animal_link_history() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'cooperative animal links are historical and cannot be deleted'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW."animalId", NEW."cooperativeId", NEW."membershipId", NEW."source", NEW."linkedAt", NEW."linkedByUserId", NEW."createdAt")
    IS DISTINCT FROM (OLD."animalId", OLD."cooperativeId", OLD."membershipId", OLD."source", OLD."linkedAt", OLD."linkedByUserId", OLD."createdAt") THEN
    RAISE EXCEPTION 'cooperative animal link identity and provenance are immutable';
  END IF;
  IF OLD."status" = 'ENDED' AND (NEW."status" <> OLD."status" OR NEW."endedAt" IS DISTINCT FROM OLD."endedAt" OR NEW."endedByUserId" IS DISTINCT FROM OLD."endedByUserId") THEN
    RAISE EXCEPTION 'ended cooperative animal links cannot be rewritten or reactivated';
  END IF;
  IF NEW."status" = 'ACTIVE' AND (NEW."endedAt" IS NOT NULL OR (NEW."membershipId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "farmer_cooperative_memberships" m WHERE m."id" = NEW."membershipId" AND m."cooperativeId" = NEW."cooperativeId" AND m."status" = 'ACTIVE'
  ))) THEN
    RAISE EXCEPTION 'active animal links require an active cooperative membership and no end date';
  END IF;
  IF NEW."status" = 'ENDED' AND NEW."endedAt" IS NULL THEN RAISE EXCEPTION 'ended animal links require an end date'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER animal_link_history_guard BEFORE INSERT OR UPDATE OR DELETE ON "cooperative_animal_links"
FOR EACH ROW EXECUTE FUNCTION validate_animal_link_history();

-- Runtime animal authorization is unavailable at every persistence boundary.
ALTER TABLE "professional_authorization_scopes" DROP CONSTRAINT "professional_authorization_scope_shape";
ALTER TABLE "professional_authorization_scopes" ADD CONSTRAINT "professional_authorization_scope_shape" CHECK (
  ("scopeType" = 'COOPERATIVE' AND "farmerId" IS NULL AND "animalId" IS NULL)
  OR ("scopeType" = 'FARMER' AND "farmerId" IS NOT NULL AND "animalId" IS NULL)
);
