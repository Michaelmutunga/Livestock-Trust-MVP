import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { resolveTrustedActor } from "../src/lib/authz/auth-boundary";

const db = new PrismaClient();
const rejects = (promise: Promise<unknown>) => assert.rejects(promise);

async function main() {
  const suffix = Date.now().toString();
  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin.demo@livestocktrust.example" } });
  const farmer = await db.farmer.findFirstOrThrow();
  const cooperative = await db.cooperative.findFirstOrThrow();
  await rejects(resolveTrustedActor(db, { issuer: "caller-controlled", subject: admin.id, sessionId: "forged", expiresAt: new Date(Date.now() + 60_000), claims: {} }));
  const verified = await db.farmerConsent.create({ data: { farmerId: farmer.id, recipientCooperativeId: cooperative.id, scopeType: "CONTACT_DETAILS", captureMethod: "WRITTEN", responsiblePersonName: farmer.fullName, responsiblePersonRole: "Farmer", captureNotes: "M2C1 integrity test capture", capturedByUserId: admin.id, consentProviderType: "FARMER", consentProviderName: farmer.fullName, consentProviderFarmerId: farmer.id, evidenceReference: `m2c1-${suffix}`, purpose: "Integrity test", provenanceStatus: "VERIFIED", capturedAt: new Date(), createdByUserId: admin.id } });
  await rejects(db.$executeRaw`UPDATE farmer_consents SET "consentProviderName" = 'rewritten' WHERE id = ${verified.id}`);
  const revision = await db.consentRevision.create({ data: { consentId: verified.id, revisionNumber: 1, revisionType: "CREATED", scopeType: verified.scopeType, scopeReferenceId: verified.scopeReferenceId, captureMethod: verified.captureMethod, responsiblePersonName: verified.responsiblePersonName, responsiblePersonRole: verified.responsiblePersonRole, captureNotes: "M2C1 test revision", capturedByUserId: admin.id, consentProviderType: verified.consentProviderType, consentProviderName: verified.consentProviderName, consentProviderFarmerId: verified.consentProviderFarmerId, evidenceReference: verified.evidenceReference, purpose: verified.purpose, provenanceStatus: verified.provenanceStatus, effectiveFrom: verified.effectiveFrom, expiresAt: verified.expiresAt, createdByUserId: admin.id } });
  await rejects(db.$executeRaw`UPDATE consent_revisions SET "consentProviderName" = 'rewritten' WHERE id = ${revision.id}`);
  await rejects(db.$executeRaw`DELETE FROM consent_revisions WHERE id = ${revision.id}`);
  const legacy = await db.farmerConsent.create({ data: { farmerId: farmer.id, recipientCooperativeId: cooperative.id, scopeType: "CONTACT_DETAILS", captureMethod: "WRITTEN", responsiblePersonName: farmer.fullName, responsiblePersonRole: "Farmer", captureNotes: "M2C1 legacy test capture", capturedByUserId: admin.id, consentProviderType: "FARMER", consentProviderName: farmer.fullName, consentProviderFarmerId: farmer.id, purpose: "Legacy integrity test", provenanceStatus: "LEGACY_UNVERIFIED", capturedAt: new Date(), createdByUserId: admin.id } });
  await rejects(db.$executeRaw`UPDATE farmer_consents SET "provenanceStatus" = 'VERIFIED' WHERE id = ${legacy.id}`);

  const review = await db.professionalCredentialReview.findFirstOrThrow();
  await rejects(db.$executeRaw`UPDATE professional_credential_reviews SET reason = 'rewritten' WHERE id = ${review.id}`);
  await rejects(db.$executeRaw`DELETE FROM professional_credential_reviews WHERE id = ${review.id}`);
  const decision = await db.professionalAuthorizationDecision.findFirstOrThrow();
  await rejects(db.$executeRaw`UPDATE professional_authorization_decisions SET reason = 'rewritten' WHERE id = ${decision.id}`);
  await rejects(db.$executeRaw`DELETE FROM professional_authorization_decisions WHERE id = ${decision.id}`);

  const animal = await db.animal.create({ data: { species: "CATTLE", name: `M2C1 ${suffix}`, createdByUserId: admin.id } });
  await db.cooperativeAnimalLink.create({ data: { animalId: animal.id, cooperativeId: cooperative.id, source: "IMPORTED_RECORD", linkedByUserId: admin.id } });
  const profile = await db.professionalProfile.findFirstOrThrow();
  const authorization = await db.professionalAuthorization.create({ data: { professionalProfileId: profile.id, cooperativeId: cooperative.id, status: "EXPIRED", authorizedByUserId: admin.id, authorizedAt: new Date(Date.now() - 120_000), expiresAt: new Date(Date.now() - 60_000), scopes: { create: { scopeType: "COOPERATIVE", cooperativeId: cooperative.id } } } });
  await rejects(db.professionalAuthorizationScope.create({ data: { authorizationId: authorization.id, scopeType: "ANIMAL", cooperativeId: cooperative.id, animalId: animal.id } }));
  console.log("Milestone 2C.1 direct SQL provenance, append-only history, and animal-scope checks passed; test fixtures retained.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => db.$disconnect());
