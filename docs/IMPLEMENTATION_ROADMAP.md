# Implementation roadmap

## Completed

- Milestone 1 foundation: Next.js TypeScript application, environment template, Git-safe ignore rules, PostgreSQL Compose configuration, and handover documentation.
- Milestone 2A: Prisma 6.19.0 foundation, core identity and tenancy schema, migration, fictional seed, and database integrity tests.
- Milestone 2B: scope-specific farmer consent, consent history and revocation, access grants, manually reviewed professional credentials, scoped professional authorizations, migration, fictional test coverage, and database integrity checks.
- Milestone 2B.1: centralized deny-by-default authorization policies, transactional consent/revocation services, credential and authorization decision history, exact scope integrity, and cross-cooperative hardening tests.
- Milestone 2B.2: runtime actor-boundary capability, protected data-access services, consent capture provenance and lifecycle correction, serializable revisions, and animal-authorization deferral.
- Milestone 2B.3: explicit farmer-consent provider provenance, legacy consent quarantine, database terminal-revocation and immutable-scope guards, professional decision integrity, direct SQL tests and architecture import enforcement.
- Milestone 2C: animal identity, historical identifier rules, explicit cooperative animal links, active-link tenant checks, and animal-scoped professional authorization foreign keys.
- Milestone 2C.1: disable actor issuance until a real authentication adapter exists; immutable consent provenance and professional decision history; terminal animal identifier/link history; database rejection of animal authorization scopes.

## Current milestone

- Milestone 2C.1 hardening is implemented and its two incremental migrations are applied. Authentication and animal authorization remain disabled. PostgreSQL verification used host port 5433 because an unrelated service occupies 5432.

## Next milestone

- Next phase: independent review of Milestone 2C.1. Ownership claims, evidence review and transfer history require separate approval.

## Later milestones

- Auth.js and authorization
- Cooperative and farmer management
- Livestock registry and passports
- Veterinary, breeding, and milk records
- Interventions, dashboards, and reports
