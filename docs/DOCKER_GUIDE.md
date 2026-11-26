# Docker guide

**Status: Compose configuration implemented and verified.**

The only service is `postgres:16-alpine`, exposed on container port 5432. Data is stored in the named volume `livestock_trust_postgres_data`. The health check uses `pg_isready`. In this verification environment, host port 5432 was occupied, so `POSTGRES_PORT=5433` was used without changing the Compose file.

Commands: `docker compose up -d postgres`, `docker compose ps`, `docker compose logs postgres`, `docker compose stop postgres`, and `docker compose down`.

Backup: `docker exec livestock-trust-postgres pg_dump -U livestock_trust -d livestock_trust -Fc -f /tmp/livestock-trust.dump`, then `docker cp livestock-trust-postgres:/tmp/livestock-trust.dump .\livestock-trust.dump`.

Restore: `docker cp .\livestock-trust.dump livestock-trust-postgres:/tmp/livestock-trust.dump`, then `docker exec livestock-trust-postgres pg_restore -U livestock_trust -d livestock_trust --clean --if-exists /tmp/livestock-trust.dump`.

This project does not change Docker Desktop's configured storage location. Prisma connects to the database through `DATABASE_URL`; in the verification environment the host port was 5433 because 5432 was already occupied.
