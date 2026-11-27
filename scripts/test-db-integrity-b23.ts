import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

import { resolveTrustedActor } from "../src/lib/authz/auth-boundary";
import { getEligibleConsentGrant } from "../src/lib/authz/policy";
import { getProfessionalCredentialEvidence } from "../src/lib/authz/protected-data-service";

const prisma = new PrismaClient();
const expectReject = async (operation: Promise<unknown>) => assert.rejects(operation);

async function main() {
  const suffix = Date.now().toString();
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin.demo@livestocktrust.example" } });
  const farmer = await prisma.farmer.findFirstOrThrow({ where: { fullName: "Amina Demo Farmer" } });
  const cooperative = await prisma.cooperative.findUniqueOrThrow({ where: { registrationNumber: "DEMO-COOP-001" } });
  const professional = await prisma.professionalProfile.findFirstOrThrow();
  const actor = await resolveTrustedActor(prisma, { issuer: "integrity-test", subject: admin.id, sessionId: `integrity-${suffix}`, expiresAt: new Date(Date.now() + 60_000), claims: { test: true } });
  let legacyConsentId: string | undefined;
  let revokedConsentId: string | undefined;
  let grantId: string | undefined;
  let scopeConsentId: string | undefined;
  let testUserId: string | undefined;
  let testProfileId: string | undefined;

  try {
    const common = { farmerId: farmer.id, recipientCooperativeId: cooperative.id, scopeType: "CONTACT_DETAILS" as const, captureMethod: "RECORDED_VERBAL" as const, responsiblePersonName: "Integrity fixture", responsiblePersonRole: "Fixture", consentProviderType: "FARMER" as const, consentProviderName: farmer.fullName, consentProviderFarmerId: farmer.id, purpose: "Integrity fixture", captureNotes: "Fixture note", capturedByUserId: admin.id, createdByUserId: admin.id, capturedAt: new Date() };
    const legacy = await prisma.farmerConsent.create({ data: { ...common, provenanceStatus: "LEGACY_UNVERIFIED" } });
    legacyConsentId = legacy.id;
    const legacyGrant = await prisma.recordAccessGrant.create({ data: { farmerId: farmer.id, recipientCooperativeId: cooperative.id, consentId: legacy.id, grantType: "CONSENT", scopeType: "CONTACT_DETAILS", createdByUserId: admin.id } });
    grantId = legacyGrant.id;
    assert.equal(await getEligibleConsentGrant(prisma, actor, { farmerId: farmer.id, cooperativeId: cooperative.id, scopeType: "CONTACT_DETAILS" }), null);
    await prisma.recordAccessGrant.delete({ where: { id: legacyGrant.id } });
    grantId = undefined;

    const revoked = await prisma.farmerConsent.create({ data: { ...common, provenanceStatus: "VERIFIED" } });
    revokedConsentId = revoked.id;
    await prisma.$executeRawUnsafe(`UPDATE farmer_consents SET "consentStatus" = 'REVOKED', "revokedAt" = CURRENT_TIMESTAMP WHERE id = '${revoked.id}'`);
    await expectReject(prisma.$executeRawUnsafe(`UPDATE farmer_consents SET "consentStatus" = 'ACTIVE', "revokedAt" = NULL WHERE id = '${revoked.id}'`));

    const grantConsent = await prisma.farmerConsent.create({ data: { ...common, provenanceStatus: "VERIFIED", scopeReferenceId: `grant-${suffix}` } });
    const grant = await prisma.recordAccessGrant.create({ data: { farmerId: farmer.id, recipientCooperativeId: cooperative.id, consentId: grantConsent.id, grantType: "CONSENT", scopeType: "CONTACT_DETAILS", scopeReferenceId: `grant-${suffix}`, createdByUserId: admin.id } });
    grantId = grant.id;
    await prisma.$executeRawUnsafe(`UPDATE record_access_grants SET "status" = 'REVOKED', "revokedAt" = CURRENT_TIMESTAMP WHERE id = '${grant.id}'`);
    await expectReject(prisma.$executeRawUnsafe(`UPDATE record_access_grants SET "status" = 'ACTIVE', "revokedAt" = NULL WHERE id = '${grant.id}'`));
    await prisma.recordAccessGrant.delete({ where: { id: grant.id } });
    grantId = undefined;
    await prisma.farmerConsent.delete({ where: { id: grantConsent.id } });

    const scopeConsent = await prisma.farmerConsent.create({ data: { ...common, provenanceStatus: "VERIFIED", scopeReferenceId: `immutable-${suffix}` } });
    scopeConsentId = scopeConsent.id;
    await expectReject(prisma.$executeRawUnsafe(`UPDATE farmer_consents SET "scopeType" = 'MILK_PRODUCTION' WHERE id = '${scopeConsent.id}'`));

    await expectReject(prisma.professionalAuthorizationScope.create({ data: { authorizationId: "does-not-exist", scopeType: "ANIMAL", cooperativeId: cooperative.id, animalId: "deferred-animal" } }));

    const testUser = await prisma.user.create({ data: { email: `inactive-${suffix}@example.test`, displayName: "Inactive integrity fixture", status: "ACTIVE" } });
    testUserId = testUser.id;
    const testProfile = await prisma.professionalProfile.create({ data: { userId: testUser.id, professionalType: "VETERINARIAN" } });
    testProfileId = testProfile.id;
    await expectReject(prisma.professionalProfile.update({ where: { id: testProfile.id }, data: { credentialStatus: "VERIFIED", credentialVerifiedAt: new Date(), credentialReviewerId: admin.id } }));
    const testActor = await resolveTrustedActor(prisma, { issuer: "integrity-test", subject: testUser.id, sessionId: `inactive-${suffix}`, expiresAt: new Date(Date.now() + 60_000), claims: { test: true } });
    await prisma.user.update({ where: { id: testUser.id }, data: { status: "DISABLED" } });
    await expectReject(getProfessionalCredentialEvidence(prisma, testActor, testProfile.id));

    await expectReject(prisma.professionalAuthorization.create({ data: { professionalProfileId: professional.id, cooperativeId: cooperative.id, status: "ACTIVE", authorizedByUserId: admin.id, scopes: { create: { scopeType: "FARMER", cooperativeId: cooperative.id, farmerId: farmer.id } } } }));
    console.log("Milestone 2B.3 direct database integrity tests passed.");
  } finally {
    if (grantId) await prisma.recordAccessGrant.deleteMany({ where: { id: grantId } });
    if (legacyConsentId) await prisma.farmerConsent.delete({ where: { id: legacyConsentId } });
    if (revokedConsentId) await prisma.farmerConsent.delete({ where: { id: revokedConsentId } });
    if (scopeConsentId) await prisma.farmerConsent.delete({ where: { id: scopeConsentId } });
    if (testProfileId) await prisma.professionalProfile.delete({ where: { id: testProfileId } });
    if (testUserId) await prisma.user.delete({ where: { id: testUserId } });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
