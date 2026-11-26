# Architecture decisions

## ADR-001: Modular monolith

- Date: 2026-11-26
- Status: Accepted
- Decision: One Next.js App Router application with PostgreSQL for the MVP.
- Reason: Lightweight local development and deployment with clear feature boundaries.

## ADR-002: Explicit cooperative and professional authorization

- Date: 2026-11-26
- Status: Accepted
- Decision: Enforce cooperative isolation server-side. Independent veterinarians require explicit, scoped authorization. Professional identity and credential verification remain separate from cooperative access authorization.

## ADR-003: Separate ownership from cooperative association

- Date: 2026-11-26
- Status: Accepted
- Decision: Legal or claimed ownership, ownership evidence, animal cooperative association, and access authorization are separate concepts.

## ADR-004: Prisma migrations for core identity and tenancy

- Date: 2026-11-26
- Status: Accepted
- Decision: Use Prisma 6.19.0 with checked-in migrations. Milestone 2A establishes User, Party, Cooperative, Farmer, private farmer contact, cooperative membership, farmer account link, and role assignment models. Auth.js adapter tables remain deferred.
- Reason: This gives the MVP a type-safe, reviewable database baseline while keeping authentication and later domain modules in separate controlled milestones.

## ADR-005: Scoped consent and independent professional authorization

- Date: 2026-11-26
- Status: Accepted
- Decision: Store farmer consent as scope-specific, revisioned, and revocable records. Keep professional credential verification separate from cooperative authorization, and require authorization scopes to carry a cooperative context plus a valid farmer or deferred animal reference where applicable.
- Reason: Consent must not become an unbounded data-sharing grant, and a professional account or role must not imply verified credentials or access to cooperative records.
- Decision: Milestone 2B.1 uses centralized deny-by-default authorization services. Consent grants must reference an exact active consent scope; administrative grants are disabled for the MVP. Professional credential review and authorization decisions are append-only history, and active authorizations require verified credentials, accepted evidence, explicit reviewer/authorizer permissions, matching cooperative scope, and non-expired/non-revoked status.
