import type { Prisma, PrismaClient } from "@prisma/client";

import type { TrustedActorContext } from "./context";
import { AuthorizationDeniedError } from "./errors";
import { assertActiveActor, assertCanAccessCooperative, getEligibleConsentGrant } from "./policy";

type DatabaseClient = Prisma.TransactionClient | PrismaClient;

export async function getFarmerPrivateContact(db: DatabaseClient, actor: TrustedActorContext, farmerId: string, cooperativeId: string, scopeReferenceId?: string) {
  await getEligibleConsentGrant(db, actor, { farmerId, cooperativeId, scopeType: "CONTACT_DETAILS", scopeReferenceId });
  return db.farmerPrivateContact.findUnique({ where: { farmerId } });
}

export async function getFarmerConsent(db: DatabaseClient, actor: TrustedActorContext, consentId: string, cooperativeId: string) {
  await assertCanAccessCooperative(db, actor, cooperativeId);
  const consent = await db.farmerConsent.findFirst({ where: { id: consentId, recipientCooperativeId: cooperativeId } });
  if (!consent) throw new AuthorizationDeniedError();
  return consent;
}

export async function getRecordAccessGrant(db: DatabaseClient, actor: TrustedActorContext, grantId: string, cooperativeId: string) {
  await assertCanAccessCooperative(db, actor, cooperativeId);
  const grant = await db.recordAccessGrant.findFirst({ where: { id: grantId, recipientCooperativeId: cooperativeId } });
  if (!grant) throw new AuthorizationDeniedError();
  return grant;
}

export async function getProfessionalCredentialEvidence(db: DatabaseClient, actor: TrustedActorContext, professionalProfileId: string) {
  await assertActiveActor(db, actor);
  const profile = await db.professionalProfile.findUnique({ where: { id: professionalProfileId }, select: { userId: true } });
  if (!profile) throw new AuthorizationDeniedError();
  if (profile.userId !== actor.userId) {
    const systemAdministrator = await db.roleAssignment.findFirst({ where: { userId: actor.userId, role: "SYSTEM_ADMINISTRATOR", cooperativeId: null, revokedAt: null }, select: { id: true } });
    if (!systemAdministrator) throw new AuthorizationDeniedError();
  }
  return db.professionalCredentialEvidence.findMany({ where: { professionalProfileId }, orderBy: { submittedAt: "desc" } });
}

export async function getProfessionalAuthorization(db: DatabaseClient, actor: TrustedActorContext, authorizationId: string) {
  await assertActiveActor(db, actor);
  const authorization = await db.professionalAuthorization.findUnique({ where: { id: authorizationId }, include: { professionalProfile: { select: { userId: true } } } });
  if (!authorization) throw new AuthorizationDeniedError();
  if (authorization.professionalProfile.userId !== actor.userId) await assertCanAccessCooperative(db, actor, authorization.cooperativeId);
  return authorization;
}
