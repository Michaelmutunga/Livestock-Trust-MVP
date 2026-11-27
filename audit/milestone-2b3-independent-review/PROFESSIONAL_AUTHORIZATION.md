# Professional authorization integrity

## Application workflow

1. System administrator reviews professional evidence through `reviewProfessionalCredentials()`.
2. Accepted evidence and valid review history are required for a verified profile.
3. Cooperative/system administrator authorization creates a suspended authorization, writes an `AUTHORIZED` decision, then activates it.
4. Policy checks current credential status, accepted evidence, authorization status, dates, revocation and scope.
5. Credential rejection/expiry/revocation denies future authorization access.
6. Revocation writes a decision and terminal revocation state.

## Database protections

Triggers require:

- accepted evidence to have an active system-administrator reviewer;
- verified profiles to have valid verified review history and accepted evidence;
- active authorizations to have a valid authorized decision, verified profile and accepted evidence;
- review and authorization decision history to remain while authority is active.

Animal scopes are rejected by service, policy and `professional_authorization_scope_animal_deferred` until the Animal module exists.

## Limitations

Database triggers validate stored workflow state and role assignments. They do not establish real-world professional identity or external license validity. External verification remains an operational responsibility.
