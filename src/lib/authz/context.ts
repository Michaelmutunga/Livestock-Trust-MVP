/**
 * This branded context must be created by the future authentication adapter.
 * Request handlers must never construct it from an arbitrary request value.
 */
export type TrustedActorContext = {
  readonly userId: string;
  readonly __trustedActorContext: "auth-layer";
};
