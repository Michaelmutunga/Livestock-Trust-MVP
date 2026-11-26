import { Prisma, PrismaClient } from "@prisma/client";

import { AuthorizationDeniedError } from "./errors";
import type { TrustedActorContext } from "./context";
import { assertCanManageConsent } from "./policy";

type ConsentInput = {
  farmerId: string;
  recipientCooperativeId: string;
  scopeType: Prisma.ConsentScopeType;
  scopeReferenceId?: string;
  captureMethod: Prisma.ConsentCaptureMethod;
  responsiblePersonName: string;
  responsiblePersonRole: string;
  capturedAt: Date;
  effectiveFrom?: Date;
  expiresAt?: Date;
};

export async function createConsent(prisma: PrismaClient, actor: TrustedActorContext, input: ConsentInput) {
  return prisma.$transaction(async (tx) => {
    await assertCanManageConsent(tx, actor, input.recipientCooperativeId);
    const consent = await tx.farmerConsent.create({ data: { ...input, createdByUserId: actor.userId } });
    await tx.consentRevision.create({
      data: {
        consentId: consent.id,
        revisionNumber: 1,
        revisionType: "CREATED",
        scopeType: consent.scopeType,
        scopeReferenceId: consent.scopeReferenceId,
        captureMethod: consent.captureMethod,
        responsiblePersonName: consent.responsiblePersonName,
        responsiblePersonRole: consent.responsiblePersonRole,
        effectiveFrom: consent.effectiveFrom,
        expiresAt: consent.expiresAt,
        createdByUserId: actor.userId,
      },
    });
    return consent;
  });
}

export async function reviseConsent(prisma: PrismaClient, actor: TrustedActorContext, consentId: string, input: Omit<ConsentInput, "farmerId" | "recipientCooperativeId">, reason: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.farmerConsent.findUnique({ where: { id: consentId } });
    if (!current) throw new AuthorizationDeniedError();
    await assertCanManageConsent(tx, actor, current.recipientCooperativeId);
    const nextRevision = await tx.consentRevision.count({ where: { consentId } }) + 1;
    await tx.recordAccessGrant.updateMany({ where: { consentId, status: "ACTIVE" }, data: { status: "REVOKED", revokedAt: new Date(), reason: "Consent terms revised" } });
    const updated = await tx.farmerConsent.update({ where: { id: consentId }, data: { ...input, consentStatus: "ACTIVE", revokedAt: null } });
    await tx.consentRevision.create({ data: { consentId, revisionNumber: nextRevision, revisionType: "AMENDED", scopeType: updated.scopeType, scopeReferenceId: updated.scopeReferenceId, captureMethod: updated.captureMethod, responsiblePersonName: updated.responsiblePersonName, responsiblePersonRole: updated.responsiblePersonRole, effectiveFrom: updated.effectiveFrom, expiresAt: updated.expiresAt, reason, createdByUserId: actor.userId } });
    return updated;
  });
}

export async function createConsentAccessGrant(prisma: PrismaClient, actor: TrustedActorContext, consentId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const consent = await tx.farmerConsent.findUnique({ where: { id: consentId } });
    if (!consent || consent.consentStatus !== "ACTIVE" || consent.revokedAt || (consent.expiresAt && consent.expiresAt <= new Date())) throw new AuthorizationDeniedError();
    await assertCanManageConsent(tx, actor, consent.recipientCooperativeId);
    return tx.recordAccessGrant.create({ data: { farmerId: consent.farmerId, recipientCooperativeId: consent.recipientCooperativeId, consentId: consent.id, grantType: "CONSENT", scopeType: consent.scopeType, scopeReferenceId: consent.scopeReferenceId, reason, createdByUserId: actor.userId } });
  });
}

export async function revokeConsent(prisma: PrismaClient, actor: TrustedActorContext, consentId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.farmerConsent.findUnique({ where: { id: consentId } });
    if (!current) throw new AuthorizationDeniedError();
    await assertCanManageConsent(tx, actor, current.recipientCooperativeId);
    const revokedAt = new Date();
    await tx.consentRevocation.create({ data: { consentId, revokedAt, reason, createdByUserId: actor.userId } });
    await tx.recordAccessGrant.updateMany({ where: { consentId, status: "ACTIVE" }, data: { status: "REVOKED", revokedAt, reason: "Parent consent revoked" } });
    return tx.farmerConsent.update({ where: { id: consentId }, data: { consentStatus: "REVOKED", revokedAt } });
  });
}
