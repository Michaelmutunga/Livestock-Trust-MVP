import { PrismaClient } from "@prisma/client";
import type { AuthorizationScopeType, CredentialReviewDecision } from "@prisma/client";

import { AuthorizationDeniedError } from "./errors";
import type { TrustedActorContext } from "./context";
import { assertCanManageProfessionalAuthorization, assertCanReviewCredentials } from "./policy";

export async function reviewProfessionalCredentials(prisma: PrismaClient, actor: TrustedActorContext, profileId: string, decision: CredentialReviewDecision, reason: string, evidenceId?: string) {
  return prisma.$transaction(async (tx) => {
    await assertCanReviewCredentials(tx, actor);
    const profile = await tx.professionalProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new AuthorizationDeniedError();
    if (decision === "VERIFIED") {
      const accepted = await tx.professionalCredentialEvidence.count({ where: { professionalProfileId: profileId, status: "ACCEPTED" } });
      if (!accepted && !evidenceId) throw new AuthorizationDeniedError("Verified credentials require accepted supporting evidence.");
    }
    if (evidenceId) {
      const evidence = await tx.professionalCredentialEvidence.findFirst({ where: { id: evidenceId, professionalProfileId: profileId } });
      if (!evidence) throw new AuthorizationDeniedError();
      await tx.professionalCredentialEvidence.update({ where: { id: evidenceId }, data: { status: decision === "VERIFIED" ? "ACCEPTED" : decision === "REJECTED" ? "REJECTED" : "SUPERSEDED", reviewedByUserId: actor.userId, reviewedAt: new Date(), reviewNotes: reason } });
    }
    await tx.professionalCredentialReview.create({ data: { professionalProfileId: profileId, decision, reviewerUserId: actor.userId, evidenceId, reason } });
    return tx.professionalProfile.update({ where: { id: profileId }, data: { credentialStatus: decision, credentialVerifiedAt: decision === "VERIFIED" ? new Date() : null, credentialReviewerId: actor.userId, credentialReviewNotes: reason } });
  });
}

type AuthorizationScopeInput = { scopeType: AuthorizationScopeType; farmerId?: string; animalId?: string };

export async function createProfessionalAuthorization(prisma: PrismaClient, actor: TrustedActorContext, professionalProfileId: string, cooperativeId: string, scopes: AuthorizationScopeInput[], expiresAt?: Date) {
  return prisma.$transaction(async (tx) => {
    await assertCanManageProfessionalAuthorization(tx, actor, cooperativeId);
    const profile = await tx.professionalProfile.findUnique({ where: { id: professionalProfileId } });
    if (!profile || profile.credentialStatus !== "VERIFIED") throw new AuthorizationDeniedError("Verified professional credentials are required.");
    if ((await tx.professionalCredentialEvidence.count({ where: { professionalProfileId, status: "ACCEPTED" } })) < 1) throw new AuthorizationDeniedError("Accepted credential evidence is required.");
    if (scopes.length === 0 || scopes.some((scope) => scope.farmerId && scope.animalId) || scopes.some((scope) => scope.scopeType === "ANIMAL" || scope.animalId)) throw new AuthorizationDeniedError("Animal authorization is unavailable until the Animal access policy is implemented.");
    const authorization = await tx.professionalAuthorization.create({ data: { professionalProfileId, cooperativeId, status: "SUSPENDED", expiresAt, authorizedByUserId: actor.userId, scopes: { create: scopes.map((scope) => ({ ...scope, cooperativeId })) } }, include: { scopes: true } });
    await tx.professionalAuthorizationDecision.create({ data: { authorizationId: authorization.id, decision: "AUTHORIZED", actorUserId: actor.userId, reason: "Authorization created" } });
    return tx.professionalAuthorization.update({ where: { id: authorization.id }, data: { status: "ACTIVE" }, include: { scopes: true } });
  });
}

export async function revokeProfessionalAuthorization(prisma: PrismaClient, actor: TrustedActorContext, authorizationId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const authorization = await tx.professionalAuthorization.findUnique({ where: { id: authorizationId } });
    if (!authorization) throw new AuthorizationDeniedError();
    await assertCanManageProfessionalAuthorization(tx, actor, authorization.cooperativeId);
    const revokedAt = new Date();
    await tx.professionalAuthorizationDecision.create({ data: { authorizationId, decision: "REVOKED", actorUserId: actor.userId, reason } });
    return tx.professionalAuthorization.update({ where: { id: authorizationId }, data: { status: "REVOKED", revokedAt, revokedByUserId: actor.userId, revocationReason: reason } });
  });
}
