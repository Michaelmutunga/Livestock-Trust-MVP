# System architecture

**Status: Milestone 2A core identity and tenancy implemented; remaining domain architecture planned.**

The system is a modular monolith: one Next.js App Router application backed by PostgreSQL. Prisma is now configured for the core identity and tenancy models. Server actions, route handlers, and data-access functions must enforce authorization. Auth.js adapter tables remain deferred.

Feature boundaries are planned for cooperatives, farmers, livestock, veterinary, breeding, milk production, interventions, reports, identity and access, and audit. A farmer's cooperative memberships do not determine animal ownership. Ownership, evidence, cooperative association, and authorization are separate concepts.

```text
Browser -> Next.js App Router -> server authorization/data access -> PostgreSQL

The server authorization boundary is centralized in `src/lib/authz/`. It accepts only a trusted actor context from the future authentication layer, uses deny-by-default policy functions, and evaluates consent and professional authorization status, scope, expiry, revocation, and cooperative boundaries before access. Request payload IDs are not trusted as proof of identity or permission.
                                             |-> future file storage for photos
```
