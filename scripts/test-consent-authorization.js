const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function eligibleConsentGrant(farmerId, cooperativeId, scopeType) {
  const now = new Date();
  return prisma.recordAccessGrant.findMany({
    where: {
      farmerId,
      recipientCooperativeId: cooperativeId,
      scopeType,
      status: "ACTIVE",
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      consent: {
        consentStatus: "ACTIVE",
        revokedAt: null,
        effectiveFrom: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    },
    include: { consent: true },
  });
}

async function main() {
  const suffix = Date.now().toString();
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin.demo@livestocktrust.example" } });
  const farmer = await prisma.farmer.findFirstOrThrow({ where: { fullName: "Amina Demo Farmer" } });
  const cooperativeA = await prisma.cooperative.findUniqueOrThrow({ where: { registrationNumber: "DEMO-COOP-001" } });
  const cooperativeB = await prisma.cooperative.create({ data: { name: `Consent Test Cooperative ${suffix}`, createdByUserId: admin.id } });
  const professionalUser = await prisma.user.create({ data: { email: `vet-${suffix}@example.test`, displayName: "Test Veterinarian", status: "ACTIVE" } });
  const professionalRole = await prisma.roleAssignment.create({ data: { userId: professionalUser.id, role: "VETERINARIAN", createdByUserId: admin.id } });

  const consent = await prisma.farmerConsent.create({
    data: {
      farmerId: farmer.id,
      recipientCooperativeId: cooperativeB.id,
      scopeType: "CONTACT_DETAILS",
      captureMethod: "RECORDED_VERBAL",
      responsiblePersonName: "Demo Field Officer",
      responsiblePersonRole: "Field Officer",
      capturedAt: new Date(),
      createdByUserId: admin.id,
    },
  });
  const revision = await prisma.consentRevision.create({
    data: {
      consentId: consent.id,
      revisionNumber: 1,
      revisionType: "CREATED",
      scopeType: consent.scopeType,
      captureMethod: consent.captureMethod,
      responsiblePersonName: consent.responsiblePersonName,
      responsiblePersonRole: consent.responsiblePersonRole,
      effectiveFrom: consent.effectiveFrom,
      createdByUserId: admin.id,
    },
  });
  assert.equal(revision.revisionNumber, 1);
  const grant = await prisma.recordAccessGrant.create({
    data: {
      farmerId: farmer.id,
      recipientCooperativeId: cooperativeB.id,
      consentId: consent.id,
      grantType: "CONSENT",
      scopeType: "CONTACT_DETAILS",
      createdByUserId: admin.id,
    },
  });
  assert.equal((await eligibleConsentGrant(farmer.id, cooperativeB.id, "CONTACT_DETAILS")).length, 1);

  assert.equal((await eligibleConsentGrant(farmer.id, cooperativeA.id, "CONTACT_DETAILS")).length, 0);

  await prisma.consentRevocation.create({ data: { consentId: consent.id, reason: "Test revocation", createdByUserId: admin.id } });
  await prisma.farmerConsent.update({ where: { id: consent.id }, data: { consentStatus: "REVOKED", revokedAt: new Date() } });
  assert.equal((await eligibleConsentGrant(farmer.id, cooperativeB.id, "CONTACT_DETAILS")).length, 0);

  const expiredConsent = await prisma.farmerConsent.create({
    data: {
      farmerId: farmer.id,
      recipientCooperativeId: cooperativeB.id,
      scopeType: "ANIMAL_SUMMARY",
      scopeReferenceId: "future-animal-reference",
      captureMethod: "DIGITAL",
      responsiblePersonName: "Demo Farmer",
      responsiblePersonRole: "Farmer",
      capturedAt: new Date(Date.now() - 172800000),
      effectiveFrom: new Date(Date.now() - 172800000),
      expiresAt: new Date(Date.now() - 86400000),
      consentStatus: "EXPIRED",
      createdByUserId: admin.id,
    },
  });
  await prisma.recordAccessGrant.create({
    data: {
      farmerId: farmer.id,
      recipientCooperativeId: cooperativeB.id,
      consentId: expiredConsent.id,
      grantType: "CONSENT",
      scopeType: "ANIMAL_SUMMARY",
      scopeReferenceId: "future-animal-reference",
      createdByUserId: admin.id,
    },
  });
  assert.equal((await eligibleConsentGrant(farmer.id, cooperativeB.id, "ANIMAL_SUMMARY")).length, 0);

  const profile = await prisma.professionalProfile.create({ data: { userId: professionalUser.id, professionalType: "VETERINARIAN" } });
  assert.equal(profile.credentialStatus, "PENDING");
  const evidence = await prisma.professionalCredentialEvidence.create({
    data: {
      professionalProfileId: profile.id,
      evidenceType: "LICENSE_DOCUMENT",
      description: "Fictional credential evidence for testing",
      submittedByUserId: professionalUser.id,
    },
  });
  await prisma.professionalCredentialEvidence.update({ where: { id: evidence.id }, data: { status: "ACCEPTED", reviewedByUserId: admin.id, reviewedAt: new Date(), reviewNotes: "Accepted for test" } });
  const verifiedProfile = await prisma.professionalProfile.update({ where: { id: profile.id }, data: { credentialStatus: "VERIFIED", credentialVerifiedAt: new Date(), credentialReviewerId: admin.id } });
  assert.equal(verifiedProfile.credentialStatus, "VERIFIED");

  const authorization = await prisma.professionalAuthorization.create({
    data: {
      professionalProfileId: profile.id,
      cooperativeId: cooperativeA.id,
      authorizedByUserId: admin.id,
      scopes: { create: { scopeType: "FARMER", cooperativeId: cooperativeA.id, farmerId: farmer.id } },
    },
    include: { scopes: true },
  });
  assert.equal(authorization.scopes[0].farmerId, farmer.id);
  const activeAuthorizations = await prisma.professionalAuthorization.findMany({ where: { id: authorization.id, status: "ACTIVE", expiresAt: null, professionalProfile: { credentialStatus: "VERIFIED" }, scopes: { some: { scopeType: "FARMER", farmerId: farmer.id, cooperativeId: cooperativeA.id } } } });
  assert.equal(activeAuthorizations.length, 1);

  await prisma.professionalAuthorization.update({ where: { id: authorization.id }, data: { status: "REVOKED", revokedAt: new Date(), revokedByUserId: admin.id, revocationReason: "Test revocation" } });
  assert.equal((await prisma.professionalAuthorization.findMany({ where: { id: authorization.id, status: "ACTIVE" } })).length, 0);

  await assert.rejects(
    prisma.professionalAuthorizationScope.create({ data: { authorizationId: authorization.id, scopeType: "COOPERATIVE", cooperativeId: cooperativeA.id, farmerId: farmer.id } }),
    /professional_authorization_scope_shape|check constraint|violates check constraint/i,
  );
  await assert.rejects(
    prisma.professionalAuthorizationScope.create({ data: { authorizationId: authorization.id, scopeType: "FARMER", cooperativeId: cooperativeB.id, farmerId: farmer.id } }),
    /professional_authorization_scope_farmer_cooperative_fk|foreign key constraint|violates foreign key|Unique constraint/i,
  );

  await prisma.professionalAuthorizationScope.deleteMany({ where: { authorizationId: authorization.id } });
  await prisma.professionalAuthorization.delete({ where: { id: authorization.id } });
  await prisma.professionalCredentialEvidence.delete({ where: { id: evidence.id } });
  await prisma.professionalProfile.delete({ where: { id: profile.id } });
  await prisma.roleAssignment.delete({ where: { id: professionalRole.id } });
  await prisma.user.delete({ where: { id: professionalUser.id } });
  await prisma.recordAccessGrant.deleteMany({ where: { id: { in: [grant.id] } } });
  await prisma.consentRevocation.deleteMany({ where: { consentId: consent.id } });
  await prisma.consentRevision.deleteMany({ where: { consentId: consent.id } });
  await prisma.farmerConsent.delete({ where: { id: consent.id } });
  await prisma.recordAccessGrant.deleteMany({ where: { consentId: expiredConsent.id } });
  await prisma.farmerConsent.delete({ where: { id: expiredConsent.id } });
  await prisma.cooperative.delete({ where: { id: cooperativeB.id } });
  console.log("Consent, revocation, expiry, authorization, credential, scope, and unauthorized-access tests passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
