import { Prisma, PrismaClient } from "@prisma/client";
import type { ConsentCaptureMethod, ConsentProviderType, ConsentScopeType } from "@prisma/client";

import { AuthorizationDeniedError } from "./errors";
import type { TrustedActorContext } from "./context";
import { assertCanCaptureConsent, assertCanManageConsent } from "./policy";

type ConsentInput = {
  farmerId: string;
  recipientCooperativeId: string;
  scopeType: ConsentScopeType;
  scopeReferenceId?: string;
  captureMethod: ConsentCaptureMethod;
  responsiblePersonName: string;
  responsiblePersonRole: string;
  captureNotes: string;
  consentProviderType: ConsentProviderType;
  consentProviderName: string;
  consentProviderFarmerId?: string;
  consentProviderUserId?: string;
  representativeAuthorityEvidence?: string;
  evidenceReference?: string;
  purpose: string;
  capturedAt: Date;
  effectiveFrom?: Date;
  expiresAt?: Date;
};

export async function createConsent(prisma: PrismaClient, actor: TrustedActorContext, input: ConsentInput) {
  return prisma.$transaction(async (tx) => {
    await assertCanCaptureConsent(tx, actor, input.recipientCooperativeId, input.farmerId);
    if (!input.captureNotes.trim() || !input.purpose.trim() || !input.consentProviderName.trim()) throw new AuthorizationDeniedError("Consent provenance fields are required.");
    if (input.captureMethod !== "RECORDED_VERBAL" && !input.evidenceReference?.trim()) throw new AuthorizationDeniedError("Written and digital consent require an evidence or attestation reference.");
    if (input.consentProviderType === "FARMER" && (input.consentProviderFarmerId !== input.farmerId || input.consentProviderUserId || input.representativeAuthorityEvidence)) throw new AuthorizationDeniedError("Farmer consent provider identity is invalid.");
    if (input.consentProviderType === "REPRESENTATIVE" && (!input.consentProviderUserId || !input.representativeAuthorityEvidence?.trim() || input.consentProviderFarmerId)) throw new AuthorizationDeniedError("Representative authority evidence is required.");
    const consent = await tx.farmerConsent.create({ data: { ...input, provenanceStatus: "VERIFIED", capturedByUserId: actor.userId, createdByUserId: actor.userId } });
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
        captureNotes: consent.captureNotes,
        capturedByUserId: consent.capturedByUserId,
        consentProviderType: consent.consentProviderType,
        consentProviderName: consent.consentProviderName,
        consentProviderFarmerId: consent.consentProviderFarmerId,
        consentProviderUserId: consent.consentProviderUserId,
        representativeAuthorityEvidence: consent.representativeAuthorityEvidence,
        evidenceReference: consent.evidenceReference,
        purpose: consent.purpose,
        provenanceStatus: consent.provenanceStatus,
        effectiveFrom: consent.effectiveFrom,
        expiresAt: consent.expiresAt,
        createdByUserId: actor.userId,
      },
    });
    return consent;
  });
}

export async function reviseConsent(prisma: PrismaClient, actor: TrustedActorContext, consentId: string, input: Pick<ConsentInput, "captureMethod" | "responsiblePersonName" | "responsiblePersonRole" | "captureNotes" | "capturedAt" | "effectiveFrom" | "expiresAt">, reason: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.farmerConsent.findUnique({ where: { id: consentId } });
    if (!current) throw new AuthorizationDeniedError();
    if (current.consentStatus === "REVOKED" || current.revokedAt) throw new AuthorizationDeniedError("Revoked consent is terminal; capture a new consent instead.");
    await assertCanManageConsent(tx, actor, current.recipientCooperativeId);
    const nextRevision = await tx.consentRevision.count({ where: { consentId } }) + 1;
    await tx.recordAccessGrant.updateMany({ where: { consentId, status: "ACTIVE" }, data: { status: "REVOKED", revokedAt: new Date(), reason: "Consent terms revised" } });
    if (!input.captureNotes.trim()) throw new AuthorizationDeniedError("Consent capture notes are required.");
    const updated = await tx.farmerConsent.update({ where: { id: consentId }, data: { captureMethod: input.captureMethod, responsiblePersonName: input.responsiblePersonName, responsiblePersonRole: input.responsiblePersonRole, captureNotes: input.captureNotes, capturedAt: input.capturedAt, effectiveFrom: input.effectiveFrom, expiresAt: input.expiresAt } });
    await tx.consentRevision.create({ data: { consentId, revisionNumber: nextRevision, revisionType: "AMENDED", scopeType: updated.scopeType, scopeReferenceId: updated.scopeReferenceId, captureMethod: updated.captureMethod, responsiblePersonName: updated.responsiblePersonName, responsiblePersonRole: updated.responsiblePersonRole, captureNotes: updated.captureNotes, capturedByUserId: updated.capturedByUserId, consentProviderType: updated.consentProviderType, consentProviderName: updated.consentProviderName, consentProviderFarmerId: updated.consentProviderFarmerId, consentProviderUserId: updated.consentProviderUserId, representativeAuthorityEvidence: updated.representativeAuthorityEvidence, evidenceReference: updated.evidenceReference, purpose: updated.purpose, provenanceStatus: updated.provenanceStatus, effectiveFrom: updated.effectiveFrom, expiresAt: updated.expiresAt, reason, createdByUserId: actor.userId } });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createConsentAccessGrant(prisma: PrismaClient, actor: TrustedActorContext, consentId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const consent = await tx.farmerConsent.findUnique({ where: { id: consentId } });
    if (!consent || consent.provenanceStatus !== "VERIFIED" || consent.consentStatus !== "ACTIVE" || consent.revokedAt || (consent.expiresAt && consent.expiresAt <= new Date())) throw new AuthorizationDeniedError();
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
