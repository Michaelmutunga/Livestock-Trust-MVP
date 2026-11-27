import type { TrustedActorContext } from "./context";
import { AuthorizationDeniedError } from "./errors";

const issuedContexts = new WeakSet<object>();

export function assertTrustedActorContext(value: unknown): asserts value is TrustedActorContext {
  if (typeof value !== "object" || value === null || !issuedContexts.has(value) || (value as TrustedActorContext).expiresAt <= new Date()) {
    throw new AuthorizationDeniedError("A trusted authentication context is required.");
  }
}

/** No authentication provider is installed, so this module intentionally issues no actor contexts. */
export function authenticationUnavailable(): never {
  throw new AuthorizationDeniedError("Authentication is unavailable until a verified authentication adapter is implemented.");
}

/** Compatibility boundary for the future adapter; caller-supplied principals are never accepted. */
export async function resolveTrustedActor(_db: unknown, _principal: unknown): Promise<TrustedActorContext> {
  return authenticationUnavailable();
}
