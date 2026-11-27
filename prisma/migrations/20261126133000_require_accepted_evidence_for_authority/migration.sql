CREATE OR REPLACE FUNCTION require_verified_profile_integrity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."credentialStatus" = 'VERIFIED' AND (
    NOT EXISTS (SELECT 1 FROM "professional_credential_reviews" r WHERE r."professionalProfileId" = NEW.id AND r."decision" = 'VERIFIED' AND EXISTS (SELECT 1 FROM "role_assignments" a WHERE a."userId" = r."reviewerUserId" AND a."role" = 'SYSTEM_ADMINISTRATOR' AND a."cooperativeId" IS NULL AND a."revokedAt" IS NULL))
    OR NOT EXISTS (SELECT 1 FROM "professional_credential_evidence" e WHERE e."professionalProfileId" = NEW.id AND e.status = 'ACCEPTED')
  ) THEN
    RAISE EXCEPTION 'Verified professional profile requires valid review history and accepted evidence';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION require_active_authorization_decision()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND (
    NOT EXISTS (SELECT 1 FROM "professional_authorization_decisions" d WHERE d."authorizationId" = NEW.id AND d."decision" = 'AUTHORIZED' AND EXISTS (SELECT 1 FROM "role_assignments" a WHERE a."userId" = d."actorUserId" AND a."revokedAt" IS NULL AND ((a."role" = 'SYSTEM_ADMINISTRATOR' AND a."cooperativeId" IS NULL) OR (a."role" = 'COOPERATIVE_ADMINISTRATOR' AND a."cooperativeId" = NEW."cooperativeId"))))
    OR NOT EXISTS (SELECT 1 FROM "professional_profiles" p WHERE p.id = NEW."professionalProfileId" AND p."credentialStatus" = 'VERIFIED')
    OR NOT EXISTS (SELECT 1 FROM "professional_credential_evidence" e WHERE e."professionalProfileId" = NEW."professionalProfileId" AND e.status = 'ACCEPTED')
  ) THEN
    RAISE EXCEPTION 'Active professional authorization requires valid decision, verified credentials and accepted evidence';
  END IF;
  RETURN NEW;
END;
$$;
