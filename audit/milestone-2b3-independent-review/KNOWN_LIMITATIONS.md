# Known limitations and deferred functionality

## Authentication

Auth.js and a real verified-principal provider are not implemented. The actor boundary is prepared but production authentication and session validation are intentionally deferred.

## Consent

The repository records provider/capture metadata and representative authority evidence, but cannot independently prove real-world farmer agreement or legal sufficiency. Evidence references are application values and require operational validation.

## Data-access enforcement

Protected services exist and source architecture checks pass. The global Prisma client remains available to infrastructure and test code. Future server actions, jobs and workers must remain within the approved-service architecture.

## Prisma drift

Raw triggers, functions, checks and partial indexes require reviewed SQL migrations because Prisma schema metadata does not fully represent them.

## Deferred modules

Animal identity, ownership, veterinary, breeding, milk, intervention, Auth.js adapter tables and production workflows remain deferred. Animal authorization is intentionally rejected until Animal identity exists.

## Review posture

This package prepares evidence for an independent audit. It does not approve Milestone 2B.3 or authorize Milestone 2C.
