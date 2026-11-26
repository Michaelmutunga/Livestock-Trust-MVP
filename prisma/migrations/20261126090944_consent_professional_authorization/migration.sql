-- CreateEnum
CREATE TYPE "ConsentScopeType" AS ENUM ('CONTACT_DETAILS', 'ANIMAL_SUMMARY', 'OWNERSHIP_EVIDENCE', 'VETERINARY_RECORDS', 'MILK_PRODUCTION', 'BREEDING_RECORDS', 'INTERVENTION_RECORDS', 'HOLDING_LOCATION');

-- CreateEnum
CREATE TYPE "ConsentCaptureMethod" AS ENUM ('RECORDED_VERBAL', 'WRITTEN', 'DIGITAL');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ConsentRevisionType" AS ENUM ('CREATED', 'RENEWED', 'AMENDED', 'CORRECTED');

-- CreateEnum
CREATE TYPE "AccessGrantType" AS ENUM ('CONSENT', 'ADMINISTRATIVE');

-- CreateEnum
CREATE TYPE "AccessGrantStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ProfessionalType" AS ENUM ('VETERINARIAN', 'ANIMAL_HEALTH_PROFESSIONAL');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CredentialEvidenceType" AS ENUM ('LICENSE_DOCUMENT', 'REGISTRATION_RECORD', 'IDENTITY_DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CredentialEvidenceStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ProfessionalAuthorizationStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AuthorizationScopeType" AS ENUM ('COOPERATIVE', 'FARMER', 'ANIMAL');

-- CreateTable
CREATE TABLE "farmer_consents" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "recipientCooperativeId" TEXT NOT NULL,
    "scopeType" "ConsentScopeType" NOT NULL,
    "scopeReferenceId" TEXT,
    "captureMethod" "ConsentCaptureMethod" NOT NULL,
    "responsiblePersonName" TEXT NOT NULL,
    "responsiblePersonRole" TEXT NOT NULL,
    "consentStatus" "ConsentStatus" NOT NULL DEFAULT 'ACTIVE',
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmer_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_revisions" (
    "id" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "revisionType" "ConsentRevisionType" NOT NULL,
    "scopeType" "ConsentScopeType" NOT NULL,
    "scopeReferenceId" TEXT,
    "captureMethod" "ConsentCaptureMethod" NOT NULL,
    "responsiblePersonName" TEXT NOT NULL,
    "responsiblePersonRole" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_revocations" (
    "id" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "consent_revocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_access_grants" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "recipientCooperativeId" TEXT NOT NULL,
    "consentId" TEXT,
    "grantType" "AccessGrantType" NOT NULL,
    "scopeType" "ConsentScopeType" NOT NULL,
    "scopeReferenceId" TEXT,
    "status" "AccessGrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "record_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "professionalType" "ProfessionalType" NOT NULL,
    "registrationNumber" TEXT,
    "credentialStatus" "CredentialStatus" NOT NULL DEFAULT 'PENDING',
    "credentialVerifiedAt" TIMESTAMP(3),
    "credentialReviewerId" TEXT,
    "credentialReviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_credential_evidence" (
    "id" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "evidenceType" "CredentialEvidenceType" NOT NULL,
    "storageKey" TEXT,
    "description" TEXT NOT NULL,
    "status" "CredentialEvidenceStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedByUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,

    CONSTRAINT "professional_credential_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_authorizations" (
    "id" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "cooperativeId" TEXT NOT NULL,
    "status" "ProfessionalAuthorizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "authorizedByUserId" TEXT NOT NULL,
    "authorizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "revocationReason" TEXT,

    CONSTRAINT "professional_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_authorization_scopes" (
    "id" TEXT NOT NULL,
    "authorizationId" TEXT NOT NULL,
    "scopeType" "AuthorizationScopeType" NOT NULL,
    "cooperativeId" TEXT NOT NULL,
    "farmerId" TEXT,
    "animalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_authorization_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "farmer_consents_farmerId_consentStatus_idx" ON "farmer_consents"("farmerId", "consentStatus");

-- CreateIndex
CREATE INDEX "farmer_consents_recipientCooperativeId_consentStatus_idx" ON "farmer_consents"("recipientCooperativeId", "consentStatus");

-- CreateIndex
CREATE INDEX "farmer_consents_expiresAt_idx" ON "farmer_consents"("expiresAt");

-- CreateIndex
CREATE INDEX "consent_revisions_consentId_createdAt_idx" ON "consent_revisions"("consentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "consent_revisions_consentId_revisionNumber_key" ON "consent_revisions"("consentId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "consent_revocations_consentId_key" ON "consent_revocations"("consentId");

-- CreateIndex
CREATE INDEX "record_access_grants_farmerId_recipientCooperativeId_status_idx" ON "record_access_grants"("farmerId", "recipientCooperativeId", "status");

-- CreateIndex
CREATE INDEX "record_access_grants_consentId_status_idx" ON "record_access_grants"("consentId", "status");

-- CreateIndex
CREATE INDEX "record_access_grants_expiresAt_idx" ON "record_access_grants"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "professional_profiles_userId_key" ON "professional_profiles"("userId");

-- CreateIndex
CREATE INDEX "professional_profiles_credentialStatus_idx" ON "professional_profiles"("credentialStatus");

-- CreateIndex
CREATE INDEX "professional_profiles_registrationNumber_idx" ON "professional_profiles"("registrationNumber");

-- CreateIndex
CREATE INDEX "professional_credential_evidence_professionalProfileId_stat_idx" ON "professional_credential_evidence"("professionalProfileId", "status");

-- CreateIndex
CREATE INDEX "professional_authorizations_cooperativeId_status_idx" ON "professional_authorizations"("cooperativeId", "status");

-- CreateIndex
CREATE INDEX "professional_authorizations_professionalProfileId_status_idx" ON "professional_authorizations"("professionalProfileId", "status");

-- CreateIndex
CREATE INDEX "professional_authorizations_expiresAt_idx" ON "professional_authorizations"("expiresAt");

-- CreateIndex
CREATE INDEX "professional_authorization_scopes_cooperativeId_scopeType_idx" ON "professional_authorization_scopes"("cooperativeId", "scopeType");

-- CreateIndex
CREATE INDEX "professional_authorization_scopes_farmerId_scopeType_idx" ON "professional_authorization_scopes"("farmerId", "scopeType");

-- CreateIndex
CREATE INDEX "professional_authorization_scopes_animalId_scopeType_idx" ON "professional_authorization_scopes"("animalId", "scopeType");

-- CreateIndex
CREATE UNIQUE INDEX "professional_authorization_scopes_authorizationId_scopeType_key" ON "professional_authorization_scopes"("authorizationId", "scopeType", "cooperativeId", "farmerId", "animalId");

-- AddForeignKey
ALTER TABLE "farmer_consents" ADD CONSTRAINT "farmer_consents_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_consents" ADD CONSTRAINT "farmer_consents_recipientCooperativeId_fkey" FOREIGN KEY ("recipientCooperativeId") REFERENCES "cooperatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_consents" ADD CONSTRAINT "farmer_consents_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_revisions" ADD CONSTRAINT "consent_revisions_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "farmer_consents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_revisions" ADD CONSTRAINT "consent_revisions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_revocations" ADD CONSTRAINT "consent_revocations_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "farmer_consents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_revocations" ADD CONSTRAINT "consent_revocations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_access_grants" ADD CONSTRAINT "record_access_grants_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_access_grants" ADD CONSTRAINT "record_access_grants_recipientCooperativeId_fkey" FOREIGN KEY ("recipientCooperativeId") REFERENCES "cooperatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_access_grants" ADD CONSTRAINT "record_access_grants_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "farmer_consents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_access_grants" ADD CONSTRAINT "record_access_grants_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_credentialReviewerId_fkey" FOREIGN KEY ("credentialReviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_credential_evidence" ADD CONSTRAINT "professional_credential_evidence_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "professional_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_credential_evidence" ADD CONSTRAINT "professional_credential_evidence_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_credential_evidence" ADD CONSTRAINT "professional_credential_evidence_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_authorizations" ADD CONSTRAINT "professional_authorizations_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "professional_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_authorizations" ADD CONSTRAINT "professional_authorizations_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "cooperatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_authorizations" ADD CONSTRAINT "professional_authorizations_authorizedByUserId_fkey" FOREIGN KEY ("authorizedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_authorizations" ADD CONSTRAINT "professional_authorizations_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_authorization_scopes" ADD CONSTRAINT "professional_authorization_scopes_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "professional_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_authorization_scopes" ADD CONSTRAINT "professional_authorization_scopes_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "cooperatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_authorization_scopes" ADD CONSTRAINT "professional_authorization_scopes_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Consent and grant dates must describe a valid access window.
ALTER TABLE "farmer_consents"
  ADD CONSTRAINT "farmer_consent_expiry_after_effective"
  CHECK ("expiresAt" IS NULL OR "expiresAt" > "effectiveFrom");

ALTER TABLE "record_access_grants"
  ADD CONSTRAINT "record_access_grant_expiry_after_grant"
  CHECK ("expiresAt" IS NULL OR "expiresAt" > "grantedAt");

ALTER TABLE "record_access_grants"
  ADD CONSTRAINT "record_access_grant_consent_type"
  CHECK (("grantType" = 'CONSENT' AND "consentId" IS NOT NULL) OR ("grantType" = 'ADMINISTRATIVE' AND "consentId" IS NULL));

-- Keep a consent-linked access grant attached to the same farmer and recipient.
CREATE UNIQUE INDEX "farmer_consents_id_farmer_cooperative_key"
  ON "farmer_consents"("id", "farmerId", "recipientCooperativeId");

ALTER TABLE "record_access_grants"
  ADD CONSTRAINT "record_access_grant_consent_owner_fk"
  FOREIGN KEY ("consentId", "farmerId", "recipientCooperativeId")
  REFERENCES "farmer_consents"("id", "farmerId", "recipientCooperativeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A reviewed credential must identify the reviewer and review time.
ALTER TABLE "professional_profiles"
  ADD CONSTRAINT "professional_profile_verified_review"
  CHECK (("credentialStatus" = 'VERIFIED' AND "credentialVerifiedAt" IS NOT NULL AND "credentialReviewerId" IS NOT NULL) OR "credentialStatus" <> 'VERIFIED');

ALTER TABLE "professional_credential_evidence"
  ADD CONSTRAINT "credential_evidence_review_metadata"
  CHECK (("status" IN ('ACCEPTED', 'REJECTED', 'SUPERSEDED') AND "reviewedByUserId" IS NOT NULL AND "reviewedAt" IS NOT NULL) OR "status" = 'SUBMITTED');

ALTER TABLE "professional_authorizations"
  ADD CONSTRAINT "professional_authorization_expiry_after_start"
  CHECK ("expiresAt" IS NULL OR "expiresAt" > "authorizedAt");

ALTER TABLE "professional_authorizations"
  ADD CONSTRAINT "professional_authorization_revocation_metadata"
  CHECK (("status" = 'REVOKED' AND "revokedAt" IS NOT NULL AND "revokedByUserId" IS NOT NULL) OR "status" <> 'REVOKED');

-- Scope references must match their declared scope type. animalId is an
-- intentionally deferred reference until the Animal module is introduced.
ALTER TABLE "professional_authorization_scopes"
  ADD CONSTRAINT "professional_authorization_scope_shape"
  CHECK (
    ("scopeType" = 'COOPERATIVE' AND "farmerId" IS NULL AND "animalId" IS NULL)
    OR
    ("scopeType" = 'FARMER' AND "farmerId" IS NOT NULL AND "animalId" IS NULL)
    OR
    ("scopeType" = 'ANIMAL' AND "farmerId" IS NULL AND "animalId" IS NOT NULL)
  );

-- A farmer-scoped professional authorization must target a farmer membership
-- in the same cooperative. This also prevents cross-tenant scope references.
ALTER TABLE "professional_authorization_scopes"
  ADD CONSTRAINT "professional_authorization_scope_farmer_cooperative_fk"
  FOREIGN KEY ("farmerId", "cooperativeId")
  REFERENCES "farmer_cooperative_memberships"("farmerId", "cooperativeId") ON DELETE RESTRICT ON UPDATE CASCADE;
