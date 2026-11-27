CREATE OR REPLACE FUNCTION prevent_credential_review_history_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "professional_profiles" p WHERE p.id = OLD."professionalProfileId" AND p."credentialStatus" = 'VERIFIED') THEN
    RAISE EXCEPTION 'Credential review history for a verified profile is immutable';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER professional_credential_review_history_delete_trigger BEFORE DELETE ON "professional_credential_reviews" FOR EACH ROW EXECUTE FUNCTION prevent_credential_review_history_delete();

CREATE OR REPLACE FUNCTION prevent_authorization_decision_history_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "professional_authorizations" a WHERE a.id = OLD."authorizationId" AND a.status = 'ACTIVE') THEN
    RAISE EXCEPTION 'Authorization decision history for an active authorization is immutable';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER professional_authorization_decision_history_delete_trigger BEFORE DELETE ON "professional_authorization_decisions" FOR EACH ROW EXECUTE FUNCTION prevent_authorization_decision_history_delete();
