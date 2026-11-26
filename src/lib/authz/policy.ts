import { Prisma, Role } from "@prisma/client";

import { AuthorizationDeniedError } from "./errors";
import type { TrustedActorContext } from "./context";

type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

const activeUser = async (db: DatabaseClient, actor: TrustedActorContext) => {
  const user = await db.user.findFirst({ where: { id: actor.userId, status: "ACTIVE" }, select: { id: true } });
  if (!user) throw new AuthorizationDeniedError();
  return user;
};

export async function hasRole(db: DatabaseClient, actor: TrustedActorContext, role: Role, cooperativeId?: string) {
  await activeUser(db, actor);
  return Boolean(await db.roleAssignment.findFirst({
    where: { userId: actor.userId, role, cooperativeId: cooperativeId ?? null, revokedAt: null },
    select: { id: true },
  }));
}

export async function assertCanManageConsent(db: DatabaseClient, actor: TrustedActorContext, cooperativeId: string) {
  const system = await hasRole(db, actor, "SYSTEM_ADMINISTRATOR");
  const administrator = await hasRole(db, actor, "COOPERATIVE_ADMINISTRATOR", cooperativeId);
  if (!system && !administrator) throw new AuthorizationDeniedError();
}

export async function assertCanReviewCredentials(db: DatabaseClient, actor: TrustedActorContext) {
  if (!(await hasRole(db, actor, "SYSTEM_ADMINISTRATOR"))) throw new AuthorizationDeniedError();
}

export async function assertCanManageProfessionalAuthorization(db: DatabaseClient, actor: TrustedActorContext, cooperativeId: string) {
  const system = await hasRole(db, actor, "SYSTEM_ADMINISTRATOR");
  const administrator = await hasRole(db, actor, "COOPERATIVE_ADMINISTRATOR", cooperativeId);
  if (!system && !administrator) throw new AuthorizationDeniedError();
}

export async function assertCanAccessCooperative(db: DatabaseClient, actor: TrustedActorContext, cooperativeId: string) {
  const system = await hasRole(db, actor, "SYSTEM_ADMINISTRATOR");
  const administrator = await hasRole(db, actor, "COOPERATIVE_ADMINISTRATOR", cooperativeId);
  const fieldOfficer = await hasRole(db, actor, "FIELD_OFFICER", cooperativeId);
  if (!system && !administrator && !fieldOfficer) throw new AuthorizationDeniedError();
}

export async function getEligibleConsentGrant(
  db: DatabaseClient,
  actor: TrustedActorContext,
  input: { farmerId: string; cooperativeId: string; scopeType: Prisma.ConsentScopeType; scopeReferenceId?: string },
) {
  await assertCanAccessCooperative(db, actor, input.cooperativeId);
  const now = new Date();
  return db.recordAccessGrant.findFirst({
    where: {
      farmerId: input.farmerId,
      recipientCooperativeId: input.cooperativeId,
      scopeType: input.scopeType,
      scopeReferenceId: input.scopeReferenceId ?? null,
      grantType: "CONSENT",
      status: "ACTIVE",
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      consent: {
        farmerId: input.farmerId,
        recipientCooperativeId: input.cooperativeId,
        scopeType: input.scopeType,
        scopeReferenceId: input.scopeReferenceId ?? null,
        consentStatus: "ACTIVE",
        revokedAt: null,
        effectiveFrom: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    },
    include: { consent: true },
  });
}

export async function getEligibleProfessionalAuthorization(
  db: DatabaseClient,
  actor: TrustedActorContext,
  input: { cooperativeId: string; farmerId?: string; animalId?: string },
) {
  const profile = await db.professionalProfile.findUnique({ where: { userId: actor.userId }, select: { id: true, credentialStatus: true } });
  if (!profile || profile.credentialStatus !== "VERIFIED") throw new AuthorizationDeniedError();
  const acceptedEvidence = await db.professionalCredentialEvidence.count({ where: { professionalProfileId: profile.id, status: "ACCEPTED" } });
  if (acceptedEvidence < 1) throw new AuthorizationDeniedError();
  const now = new Date();
  const scope = input.animalId
    ? { scopeType: "ANIMAL" as const, animalId: input.animalId, farmerId: null, cooperativeId: input.cooperativeId }
    : input.farmerId
      ? { scopeType: "FARMER" as const, farmerId: input.farmerId, animalId: null, cooperativeId: input.cooperativeId }
      : { scopeType: "COOPERATIVE" as const, farmerId: null, animalId: null, cooperativeId: input.cooperativeId };
  const authorization = await db.professionalAuthorization.findFirst({
    where: {
      professionalProfileId: profile.id,
      cooperativeId: input.cooperativeId,
      status: "ACTIVE",
      revokedAt: null,
      authorizedAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      scopes: { some: scope },
    },
    include: { scopes: true },
  });
  if (!authorization) throw new AuthorizationDeniedError();
  return authorization;
}
