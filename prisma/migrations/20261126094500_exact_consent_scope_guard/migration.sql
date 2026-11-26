-- Enforce exact consent scope even when scopeReferenceId is intentionally NULL.
-- PostgreSQL composite foreign keys do not compare rows containing NULL values.
CREATE OR REPLACE FUNCTION validate_record_access_grant_consent_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."grantType" = 'CONSENT' THEN
    IF NEW."consentId" IS NULL THEN
      RAISE EXCEPTION 'CONSENT access grants require consentId';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM farmer_consents c
      WHERE c.id = NEW."consentId"
        AND c."farmerId" = NEW."farmerId"
        AND c."recipientCooperativeId" = NEW."recipientCooperativeId"
        AND c."scopeType" = NEW."scopeType"
        AND c."scopeReferenceId" IS NOT DISTINCT FROM NEW."scopeReferenceId"
    ) THEN
      RAISE EXCEPTION 'CONSENT access grant scope must exactly match its consent';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER record_access_grants_exact_consent_scope_trigger
BEFORE INSERT OR UPDATE OF "consentId", "farmerId", "recipientCooperativeId", "scopeType", "scopeReferenceId", "grantType"
ON record_access_grants
FOR EACH ROW
EXECUTE FUNCTION validate_record_access_grant_consent_scope();
