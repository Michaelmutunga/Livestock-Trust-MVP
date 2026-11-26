# Implementation roadmap

## Completed

- Milestone 1 foundation: Next.js TypeScript application, environment template, Git-safe ignore rules, PostgreSQL Compose configuration, and handover documentation.
- Milestone 2A: Prisma 6.19.0 foundation, core identity and tenancy schema, migration, fictional seed, and database integrity tests.
- Milestone 2B: scope-specific farmer consent, consent history and revocation, access grants, manually reviewed professional credentials, scoped professional authorizations, migration, fictional test coverage, and database integrity checks.
- Milestone 2B.1: centralized deny-by-default authorization policies, transactional consent/revocation services, credential and authorization decision history, exact scope integrity, and cross-cooperative hardening tests.

## Current milestone

- Milestone 2B.1 is implemented and verified locally, awaiting developer review. PostgreSQL verification used host port 5433 due to an unrelated service occupying 5432.

## Next milestone

- Next phase: animal identity and cooperative animal links. Do not begin until separately approved.

## Later milestones

- Auth.js and authorization
- Cooperative and farmer management
- Livestock registry and passports
- Veterinary, breeding, and milk records
- Interventions, dashboards, and reports
