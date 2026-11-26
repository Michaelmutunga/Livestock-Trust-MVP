export class AuthorizationDeniedError extends Error {
  readonly code = "AUTHORIZATION_DENIED";

  constructor(message = "You are not authorized to perform this action.") {
    super(message);
    this.name = "AuthorizationDeniedError";
  }
}
