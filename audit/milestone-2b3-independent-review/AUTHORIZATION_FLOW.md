# Authorization flow

```text
Future verified authentication adapter
        |
        v
src/lib/authz/auth-boundary.ts
  resolveTrustedActor(principal)
        |
        v
Frozen TrustedActorContext in module-private WeakSet
        |
        v
Protected service -> assertTrustedActorContext -> active user/role reload
        |
        v
Consent/professional scope and database-state evaluation
```

## Boundary facts

- The future adapter contract includes issuer, subject, session ID, expiry and claims.
- No Auth.js adapter currently exists.
- Test scripts can call the resolver directly; this is test infrastructure, not production authentication.
- Source architecture tests prohibit application-source imports of the actor boundary outside approved modules.
- ESLint restrictions currently target App Router files; future server actions/jobs must remain within the architecture-test scope.

## Protected access

- Private contacts require exact consent grant matching farmer, cooperative, scope and optional target.
- Consent and grants require cooperative role access.
- Credential evidence requires profile ownership or active system-administrator authority.
- Professional authorization reads require active user state and owner/cooperative authority.
- Professional authorization decisions require current verified credentials and accepted evidence.

## Limitations for review

There is no real session validation, issuer configuration or production route. The capability is process-local and expiring, but production authentication remains deferred.
