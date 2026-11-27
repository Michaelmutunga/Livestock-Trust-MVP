import type { Prisma } from "@prisma/client";

import type { TrustedActorContext } from "./context";
import { AuthorizationDeniedError } from "./errors";

export type VerifiedAuthPrincipal = Readonly<{
  issuer: string;
  subject: string;
  sessionId: string;
  expiresAt: Date;
  claims: Readonly<Record<string, unknown>>;
}>;

const issuedContexts = new WeakSet<object>();

type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

/** The future Auth.js adapter is the only production module permitted to call this function. */
export async function resolveTrustedActor(db: DatabaseClient, principal: VerifiedAuthPrincipal): Promise<TrustedActorContext> {
  if (!principal || typeof principal.issuer !== "string" || principal.issuer.length === 0 || typeof principal.subject !== "string" || principal.subject.length === 0 || typeof principal.sessionId !== "string" || principal.sessionId.length === 0 || !(principal.expiresAt instanceof Date) || principal.expiresAt <= new Date()) {
    throw new AuthorizationDeniedError("A valid verified authentication principal is required.");
  }
  const user = await db.user.findFirst({ where: { id: principal.subject, status: "ACTIVE" }, select: { id: true } });
  if (!user) throw new AuthorizationDeniedError();
  const context = Object.freeze({ userId: user.id, issuer: principal.issuer, sessionId: principal.sessionId, expiresAt: principal.expiresAt });
  issuedContexts.add(context);
  return context;
}

export function assertTrustedActorContext(value: unknown): asserts value is TrustedActorContext {
  if (typeof value !== "object" || value === null || !issuedContexts.has(value) || (value as TrustedActorContext).expiresAt <= new Date()) {
    throw new AuthorizationDeniedError("A trusted authentication context is required.");
  }
}
