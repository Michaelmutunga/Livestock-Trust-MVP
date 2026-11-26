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
