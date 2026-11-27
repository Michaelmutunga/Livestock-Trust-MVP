/**
 * Authentication is intentionally unavailable. No exported function issues this
 * capability; only a future integrated authentication adapter may add an issuer.
 * Route payloads and arbitrary user IDs must never be treated as principals.
 */
export type TrustedActorContext = Readonly<{
  readonly userId: string;
  readonly issuer: string;
  readonly sessionId: string;
  readonly expiresAt: Date;
}>;
