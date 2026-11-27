# System architecture

**Status: Milestone 2A core identity and tenancy implemented; remaining domain architecture planned.**

The system is a modular monolith: one Next.js App Router application backed by PostgreSQL. Prisma is now configured for the core identity and tenancy models. Server actions, route handlers, and data-access functions must enforce authorization. Auth.js adapter tables remain deferred.

Feature boundaries are planned for cooperatives, farmers, livestock, veterinary, breeding, milk production, interventions, reports, identity and access, and audit. A farmer's cooperative memberships do not determine animal ownership. Ownership, evidence, cooperative association, and authorization are separate concepts.

```text
Browser -> Next.js App Router -> server authorization/data access -> PostgreSQL

The server authorization boundary is centralized in `src/lib/authz/`. It accepts only a trusted actor context from the future authentication layer, uses deny-by-default policy functions, and evaluates consent and professional authorization status, scope, expiry, revocation, and cooperative boundaries before access. Request payload IDs are not trusted as proof of identity or permission.

Protected records are read through approved services in `src/lib/authz/protected-data-service.ts`; an ESLint architecture rule prevents App Router files from importing Prisma or the database singleton directly. Authentication is not implemented yet, so no production user-facing authorization boundary is claimed.

Authentication is unavailable until a real authentication adapter is implemented. `src/lib/authz/auth-boundary.ts` rejects all caller-supplied principals and issues no runtime contexts. The internal WeakSet capability check remains; once an approved adapter is implemented, protected services must revalidate session expiry and current active user/role state on every authorization decision.
                                             |-> future file storage for photos
```
