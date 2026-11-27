import assert from "node:assert/strict";

import { PrismaClient } from "@prisma/client";

import { prisma } from "../src/lib/db/client";
import { resolveTrustedActor } from "../src/lib/authz/auth-boundary";
import { AuthorizationDeniedError } from "../src/lib/authz/errors";
import { createConsent, createConsentAccessGrant, reviseConsent, revokeConsent } from "../src/lib/authz/consent-service";
import { createProfessionalAuthorization, revokeProfessionalAuthorization, reviewProfessionalCredentials } from "../src/lib/authz/professional-service";
import { getEligibleConsentGrant, getEligibleProfessionalAuthorization } from "../src/lib/authz/policy";
import { getFarmerPrivateContact, getProfessionalCredentialEvidence } from "../src/lib/authz/protected-data-service";

const client = prisma as PrismaClient;
const expectDenied = async (operation: Promise<unknown>) => assert.rejects(operation, (error: unknown) => error instanceof AuthorizationDeniedError);

async function main() {
  const suffix = Date.now().toString();
  const admin = await client.user.findUniqueOrThrow({ where: { email: "admin.demo@livestocktrust.example" } });
  const farmer = await client.farmer.findFirstOrThrow({ where: { fullName: "Amina Demo Farmer" } });
  const cooperativeA = await client.cooperative.findUniqueOrThrow({ where: { registrationNumber: "DEMO-COOP-001" } });
  const cooperativeB = await client.cooperative.create({ data: { name: `Hardening Test Cooperative ${suffix}`, createdByUserId: admin.id } });
  const coopAdmin = await client.user.create({ data: { email: `coop-admin-${suffix}@example.test`, displayName: "Test Cooperative Administrator", status: "ACTIVE" } });
  const fieldOfficer = await client.user.create({ data: { email: `field-${suffix}@example.test`, displayName: "Test Field Officer", status: "ACTIVE" } });
  const veterinarian = await client.user.create({ data: { email: `vet-${suffix}@example.test`, displayName: "Test Veterinarian", status: "ACTIVE" } });
  const secondVeterinarian = await client.user.create({ data: { email: `vet-pending-${suffix}@example.test`, displayName: "Pending Test Veterinarian", status: "ACTIVE" } });
  const farmerTwo = await client.farmer.create({ data: { fullName: `Unauthorized Test Farmer ${suffix}`, createdByUserId: admin.id } });

  await client.roleAssignment.create({ data: { userId: coopAdmin.id, role: "COOPERATIVE_ADMINISTRATOR", cooperativeId: cooperativeA.id, createdByUserId: admin.id } });
  await client.roleAssignment.create({ data: { userId: fieldOfficer.id, role: "FIELD_OFFICER", cooperativeId: cooperativeA.id, createdByUserId: admin.id } });
  await client.roleAssignment.create({ data: { userId: veterinarian.id, role: "VETERINARIAN", createdByUserId: admin.id } });

  let consentId: string | undefined;
  let expiredConsentId: string | undefined;
  let nullScopeConsentId: string | undefined;
  let freshConsentId: string | undefined;
  let profileId: string | undefined;
  let pendingProfileId: string | undefined;
  let authorizationId: string | undefined;
  let expiredAuthorizationId: string | undefined;

  try {
    await expectDenied(getEligibleConsentGrant(client, { userId: admin.id, issuer: "test-suite", sessionId: "forged", expiresAt: new Date(Date.now() + 60_000) } as never, { farmerId: farmer.id, cooperativeId: cooperativeA.id, scopeType: "CONTACT_DETAILS" }));
    const principal = (subject: string) => ({ issuer: "test-suite", subject, sessionId: `test-session-${suffix}-${subject}`, expiresAt: new Date(Date.now() + 60_000), claims: { test: true } });
    const coopAdminActor = await resolveTrustedActor(client, principal(coopAdmin.id));
    const fieldActor = await resolveTrustedActor(client, principal(fieldOfficer.id));
    const adminActor = await resolveTrustedActor(client, principal(admin.id));
    const vetActor = await resolveTrustedActor(client, principal(veterinarian.id));

    const consent = await createConsent(client, fieldActor, {
      farmerId: farmer.id,
      recipientCooperativeId: cooperativeA.id,
      scopeType: "CONTACT_DETAILS",
      scopeReferenceId: "private-contact",
      captureMethod: "DIGITAL",
      responsiblePersonName: "Test Farmer",
      responsiblePersonRole: "Farmer",
      captureNotes: "Fictional field capture note",
      consentProviderType: "FARMER",
      consentProviderName: "Amina Demo Farmer",
      consentProviderFarmerId: farmer.id,
      evidenceReference: "fixture-digital-attestation",
      purpose: "Cooperative record access",
      capturedAt: new Date(),
    });
    consentId = consent.id;
    await createConsentAccessGrant(client, coopAdminActor, consent.id, "Hardening test grant");
    assert.ok(await getEligibleConsentGrant(client, coopAdminActor, { farmerId: farmer.id, cooperativeId: cooperativeA.id, scopeType: "CONTACT_DETAILS", scopeReferenceId: "private-contact" }));
    assert.ok(await getFarmerPrivateContact(client, coopAdminActor, farmer.id, cooperativeA.id, "private-contact"));
    await expectDenied(getFarmerPrivateContact(client, coopAdminActor, farmer.id, cooperativeB.id, "private-contact"));

    await expectDenied(createConsent(client, coopAdminActor, { farmerId: farmer.id, recipientCooperativeId: cooperativeA.id, scopeType: "CONTACT_DETAILS", captureMethod: "WRITTEN", responsiblePersonName: "Unauthorized", responsiblePersonRole: "Cooperative administrator", captureNotes: "Invalid capture attempt", consentProviderType: "FARMER", consentProviderName: "Amina Demo Farmer", consentProviderFarmerId: farmer.id, evidenceReference: "invalid", purpose: "Invalid", capturedAt: new Date() }));
    await expectDenied(reviseConsent(client, fieldActor, consent.id, { captureMethod: "WRITTEN", responsiblePersonName: "Unauthorized", responsiblePersonRole: "Field Officer", captureNotes: "Invalid revision attempt", capturedAt: new Date() }, "Unauthorized revision"));
    await expectDenied(revokeConsent(client, fieldActor, consent.id, "Unauthorized revocation"));

    await assert.rejects(client.recordAccessGrant.create({ data: { farmerId: farmer.id, recipientCooperativeId: cooperativeA.id, consentId: consent.id, grantType: "CONSENT", scopeType: "OWNERSHIP_EVIDENCE", scopeReferenceId: "private-contact", createdByUserId: admin.id } }));
    await assert.rejects(client.recordAccessGrant.create({ data: { farmerId: farmerTwo.id, recipientCooperativeId: cooperativeA.id, consentId: consent.id, grantType: "CONSENT", scopeType: "CONTACT_DETAILS", scopeReferenceId: "private-contact", createdByUserId: admin.id } }));
    await assert.rejects(client.recordAccessGrant.create({ data: { farmerId: farmer.id, recipientCooperativeId: cooperativeA.id, grantType: "ADMINISTRATIVE", scopeType: "CONTACT_DETAILS", createdByUserId: admin.id } }));
    const nullScopeConsent = await client.farmerConsent.create({ data: { farmerId: farmer.id, recipientCooperativeId: cooperativeA.id, scopeType: "CONTACT_DETAILS", captureMethod: "RECORDED_VERBAL", responsiblePersonName: "Null scope fixture", responsiblePersonRole: "Farmer", consentProviderType: "FARMER", consentProviderName: "Amina Demo Farmer", consentProviderFarmerId: farmer.id, purpose: "Fixture", captureNotes: "Fixture note", capturedByUserId: fieldOfficer.id, capturedAt: new Date(), createdByUserId: admin.id } });
    nullScopeConsentId = nullScopeConsent.id;
    await assert.rejects(client.recordAccessGrant.create({ data: { farmerId: farmer.id, recipientCooperativeId: cooperativeA.id, consentId: nullScopeConsent.id, grantType: "CONSENT", scopeType: "OWNERSHIP_EVIDENCE", createdByUserId: admin.id } }));
    await expectDenied(getEligibleConsentGrant(client, fieldActor, { farmerId: farmer.id, cooperativeId: cooperativeB.id, scopeType: "CONTACT_DETAILS", scopeReferenceId: "private-contact" }));

    const expiredConsent = await client.farmerConsent.create({ data: { farmerId: farmer.id, recipientCooperativeId: cooperativeA.id, scopeType: "ANIMAL_SUMMARY", scopeReferenceId: "deferred-animal", captureMethod: "RECORDED_VERBAL", responsiblePersonName: "Test Farmer", responsiblePersonRole: "Farmer", consentProviderType: "FARMER", consentProviderName: "Amina Demo Farmer", consentProviderFarmerId: farmer.id, purpose: "Fixture", captureNotes: "Fixture note", capturedByUserId: fieldOfficer.id, capturedAt: new Date(Date.now() - 172800000), effectiveFrom: new Date(Date.now() - 172800000), expiresAt: new Date(Date.now() - 86400000), createdByUserId: admin.id } });
    expiredConsentId = expiredConsent.id;
    await client.recordAccessGrant.create({ data: { farmerId: farmer.id, recipientCooperativeId: cooperativeA.id, consentId: expiredConsent.id, grantType: "CONSENT", scopeType: "ANIMAL_SUMMARY", scopeReferenceId: "deferred-animal", createdByUserId: admin.id } });
    assert.equal(await getEligibleConsentGrant(client, coopAdminActor, { farmerId: farmer.id, cooperativeId: cooperativeA.id, scopeType: "ANIMAL_SUMMARY", scopeReferenceId: "deferred-animal" }), null);
    await revokeConsent(client, coopAdminActor, consent.id, "Atomic test revocation");
    assert.equal(await getEligibleConsentGrant(client, coopAdminActor, { farmerId: farmer.id, cooperativeId: cooperativeA.id, scopeType: "CONTACT_DETAILS", scopeReferenceId: "private-contact" }), null);
    await expectDenied(reviseConsent(client, coopAdminActor, consent.id, { captureMethod: "DIGITAL", responsiblePersonName: "Attempted reactivation", responsiblePersonRole: "Administrator", captureNotes: "Must not reactivate", capturedAt: new Date() }, "Attempted reactivation"));
    const freshConsent = await createConsent(client, fieldActor, { farmerId: farmer.id, recipientCooperativeId: cooperativeA.id, scopeType: "CONTACT_DETAILS", scopeReferenceId: "private-contact", captureMethod: "DIGITAL", responsiblePersonName: "Test Field Officer", responsiblePersonRole: "Field Officer", captureNotes: "Fresh fictional consent after revocation", consentProviderType: "FARMER", consentProviderName: "Amina Demo Farmer", consentProviderFarmerId: farmer.id, evidenceReference: "fixture-attestation-1", purpose: "Cooperative record access", capturedAt: new Date() });
    freshConsentId = freshConsent.id;
    assert.notEqual(freshConsent.id, consent.id);
    const revisionResults = await Promise.allSettled([
      reviseConsent(client, coopAdminActor, freshConsent.id, { captureMethod: "DIGITAL", responsiblePersonName: "Concurrent A", responsiblePersonRole: "Field Officer", captureNotes: "Concurrent revision A", capturedAt: new Date() }, "Concurrent A"),
      reviseConsent(client, coopAdminActor, freshConsent.id, { captureMethod: "DIGITAL", responsiblePersonName: "Concurrent B", responsiblePersonRole: "Field Officer", captureNotes: "Concurrent revision B", capturedAt: new Date() }, "Concurrent B"),
    ]);
    assert.equal(revisionResults.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(revisionResults.filter((result) => result.status === "rejected").length, 1);

    const profile = await client.professionalProfile.create({ data: { userId: veterinarian.id, professionalType: "VETERINARIAN" } });
    profileId = profile.id;
    const evidence = await client.professionalCredentialEvidence.create({ data: { professionalProfileId: profile.id, evidenceType: "LICENSE_DOCUMENT", description: "Fictional hardening evidence", submittedByUserId: veterinarian.id } });
    assert.equal((await getProfessionalCredentialEvidence(client, vetActor, profile.id)).length, 1);
    await expectDenied(getProfessionalCredentialEvidence(client, fieldActor, profile.id));
    await expectDenied(reviewProfessionalCredentials(client, fieldActor, profile.id, "VERIFIED", "Unauthorized review", evidence.id));
    await expectDenied(createProfessionalAuthorization(client, coopAdminActor, profile.id, cooperativeA.id, [{ scopeType: "FARMER", farmerId: farmer.id }]));
    await reviewProfessionalCredentials(client, adminActor, profile.id, "VERIFIED", "Designated reviewer approved evidence", evidence.id);
    const authorization = await createProfessionalAuthorization(client, coopAdminActor, profile.id, cooperativeA.id, [{ scopeType: "FARMER", farmerId: farmer.id }]);
    authorizationId = authorization.id;
    assert.ok(await getEligibleProfessionalAuthorization(client, vetActor, { cooperativeId: cooperativeA.id, farmerId: farmer.id }));
    await expectDenied(getEligibleProfessionalAuthorization(client, vetActor, { cooperativeId: cooperativeA.id, animalId: "deferred-animal" }));
    await expectDenied(getEligibleProfessionalAuthorization(client, vetActor, { cooperativeId: cooperativeB.id, farmerId: farmer.id }));
    await expectDenied(createProfessionalAuthorization(client, fieldActor, profile.id, cooperativeA.id, [{ scopeType: "FARMER", farmerId: farmer.id }]));
    await expectDenied(createProfessionalAuthorization(client, coopAdminActor, profile.id, cooperativeA.id, [{ scopeType: "ANIMAL", animalId: "deferred-animal" }]));
    await assert.rejects(client.professionalAuthorizationScope.create({ data: { authorizationId: authorization.id, scopeType: "COOPERATIVE", cooperativeId: cooperativeB.id } }));
    await assert.rejects(client.professionalAuthorizationScope.create({ data: { authorizationId: authorization.id, scopeType: "FARMER", cooperativeId: cooperativeA.id, farmerId: farmer.id } }));
    await reviewProfessionalCredentials(client, adminActor, profile.id, "REJECTED", "Credential no longer valid", evidence.id);
    await expectDenied(getEligibleProfessionalAuthorization(client, vetActor, { cooperativeId: cooperativeA.id, farmerId: farmer.id }));
    await reviewProfessionalCredentials(client, adminActor, profile.id, "VERIFIED", "Credential revalidated for fixture", evidence.id);
    await revokeProfessionalAuthorization(client, coopAdminActor, authorization.id, "Atomic authorization revocation");
    await expectDenied(getEligibleProfessionalAuthorization(client, vetActor, { cooperativeId: cooperativeA.id, farmerId: farmer.id }));

    const pendingProfile = await client.professionalProfile.create({ data: { userId: secondVeterinarian.id, professionalType: "VETERINARIAN" } });
    pendingProfileId = pendingProfile.id;
    await expectDenied(reviewProfessionalCredentials(client, adminActor, pendingProfile.id, "VERIFIED", "No accepted evidence"));
    const expiredAuthorization = await client.professionalAuthorization.create({ data: { professionalProfileId: profile.id, cooperativeId: cooperativeA.id, status: "EXPIRED", authorizedByUserId: admin.id, authorizedAt: new Date(Date.now() - 172800000), expiresAt: new Date(Date.now() - 86400000), scopes: { create: { scopeType: "COOPERATIVE", cooperativeId: cooperativeA.id } } } });
    expiredAuthorizationId = expiredAuthorization.id;
    await expectDenied(getEligibleProfessionalAuthorization(client, vetActor, { cooperativeId: cooperativeA.id }));

    console.log("Authorization hardening tests passed: authority, exact consent scope, expiry, atomic revocation, credential review, authorization lifecycle, scope isolation, duplicate scopes, and cross-cooperative denial.");
  } finally {
    if (expiredAuthorizationId) await client.professionalAuthorizationDecision.deleteMany({ where: { authorizationId: expiredAuthorizationId } });
    if (expiredAuthorizationId) await client.professionalAuthorizationScope.deleteMany({ where: { authorizationId: expiredAuthorizationId } });
    if (expiredAuthorizationId) await client.professionalAuthorization.delete({ where: { id: expiredAuthorizationId } });
    if (authorizationId) await client.professionalAuthorizationDecision.deleteMany({ where: { authorizationId } });
    if (authorizationId) await client.professionalAuthorizationScope.deleteMany({ where: { authorizationId } });
    if (authorizationId) await client.professionalAuthorization.delete({ where: { id: authorizationId } });
    if (profileId) {
      await client.professionalProfile.update({ where: { id: profileId }, data: { credentialStatus: "REJECTED", credentialVerifiedAt: null, credentialReviewerId: null } });
      await client.professionalCredentialReview.deleteMany({ where: { professionalProfileId: profileId } });
      await client.professionalCredentialEvidence.deleteMany({ where: { professionalProfileId: profileId } });
      await client.professionalProfile.delete({ where: { id: profileId } });
    }
    if (pendingProfileId) await client.professionalProfile.delete({ where: { id: pendingProfileId } });
    if (consentId) {
      await client.recordAccessGrant.deleteMany({ where: { consentId } });
      await client.consentRevocation.deleteMany({ where: { consentId } });
      await client.consentRevision.deleteMany({ where: { consentId } });
      await client.farmerConsent.delete({ where: { id: consentId } });
    }
    if (expiredConsentId) {
      await client.recordAccessGrant.deleteMany({ where: { consentId: expiredConsentId } });
      await client.farmerConsent.delete({ where: { id: expiredConsentId } });
    }
    if (nullScopeConsentId) {
      await client.farmerConsent.delete({ where: { id: nullScopeConsentId } });
    }
    if (freshConsentId) {
      await client.consentRevision.deleteMany({ where: { consentId: freshConsentId } });
      await client.farmerConsent.delete({ where: { id: freshConsentId } });
    }
    await client.roleAssignment.deleteMany({ where: { userId: { in: [coopAdmin.id, fieldOfficer.id, veterinarian.id] } } });
    await client.farmer.delete({ where: { id: farmerTwo.id } });
    await client.user.deleteMany({ where: { id: { in: [coopAdmin.id, fieldOfficer.id, veterinarian.id, secondVeterinarian.id] } } });
    await client.cooperative.delete({ where: { id: cooperativeB.id } });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => client.$disconnect());
