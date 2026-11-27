/**
 * Authentication is intentionally not implemented in this milestone. The future
 * Auth.js adapter must resolve a verified principal and call resolveTrustedActor.
 * Route payloads and arbitrary user IDs must never be passed as principals.
 */
export type TrustedActorContext = Readonly<{
  readonly userId: string;
  readonly issuer: string;
  readonly sessionId: string;
  readonly expiresAt: Date;
}>;
