-- Milestone 2B.1: authorization and integrity hardening.
-- This migration preserves all existing domain records and replaces only
-- superseded composite constraints with stricter versions.

CREATE TYPE "CredentialReviewDecision" AS ENUM ('VERIFIED', 'REJECTED', 'EXPIRED', 'REVOKED');
CREATE TYPE "ProfessionalAuthorizationDecisionType" AS ENUM ('AUTHORIZED', 'REVOKED', 'SUSPENDED', 'EXPIRED');

CREATE TABLE "professional_credential_reviews" (
    "id" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "decision" "CredentialReviewDecision" NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "evidenceId" TEXT,
    "reason" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "professional_credential_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_authorization_decisions" (
    "id" TEXT NOT NULL,
    "authorizationId" TEXT NOT NULL,
    "decision" "ProfessionalAuthorizationDecisionType" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "professional_authorization_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "professional_credential_reviews_professionalProfileId_reviewedAt_idx"
  ON "professional_credential_reviews"("professionalProfileId", "reviewedAt");
CREATE INDEX "professional_authorization_decisions_authorizationId_decidedAt_idx"
  ON "professional_authorization_decisions"("authorizationId", "decidedAt");

CREATE UNIQUE INDEX "farmer_consents_id_farmerId_recipientCooperativeId_scopeType_scopeReferenceId_key"
  ON "farmer_consents"("id", "farmerId", "recipientCooperativeId", "scopeType", "scopeReferenceId");
CREATE UNIQUE INDEX "professional_authorizations_id_cooperativeId_key"
  ON "professional_authorizations"("id", "cooperativeId");

ALTER TABLE "professional_credential_reviews"
  ADD CONSTRAINT "professional_credential_reviews_professionalProfileId_fkey"
  FOREIGN KEY ("professionalProfileId") REFERENCES "professional_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_credential_reviews"
  ADD CONSTRAINT "professional_credential_reviews_reviewerUserId_fkey"
  FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_credential_reviews"
  ADD CONSTRAINT "professional_credential_reviews_evidenceId_fkey"
  FOREIGN KEY ("evidenceId") REFERENCES "professional_credential_evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_authorization_decisions"
  ADD CONSTRAINT "professional_authorization_decisions_authorizationId_fkey"
  FOREIGN KEY ("authorizationId") REFERENCES "professional_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_authorization_decisions"
  ADD CONSTRAINT "professional_authorization_decisions_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "record_access_grants"
  DROP CONSTRAINT "record_access_grant_consent_owner_fk";
ALTER TABLE "record_access_grants"
  ADD CONSTRAINT "record_access_grant_exact_consent_scope_fk"
  FOREIGN KEY ("consentId", "farmerId", "recipientCooperativeId", "scopeType", "scopeReferenceId")
  REFERENCES "farmer_consents"("id", "farmerId", "recipientCooperativeId", "scopeType", "scopeReferenceId") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "record_access_grants"
  ADD CONSTRAINT "record_access_grant_admin_disabled"
  CHECK ("grantType" = 'CONSENT');

ALTER TABLE "professional_authorization_scopes"
  ADD CONSTRAINT "professional_authorization_scope_parent_cooperative_fk"
  FOREIGN KEY ("authorizationId", "cooperativeId")
  REFERENCES "professional_authorizations"("id", "cooperativeId") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE UNIQUE INDEX "professional_scope_cooperative_unique"
  ON "professional_authorization_scopes"("authorizationId")
  WHERE "scopeType" = 'COOPERATIVE';
CREATE UNIQUE INDEX "professional_scope_farmer_unique"
  ON "professional_authorization_scopes"("authorizationId", "farmerId")
  WHERE "scopeType" = 'FARMER';
CREATE UNIQUE INDEX "professional_scope_animal_unique"
  ON "professional_authorization_scopes"("authorizationId", "animalId")
  WHERE "scopeType" = 'ANIMAL';
