# Development setup

**Status: Implemented and verified for Milestone 2A; results are recorded in `CURRENT_STATUS.md`.**

Prerequisites: Windows 10, Node.js 22, npm, and Docker Desktop. Copy `.env.example` to `.env` and replace the development password if needed.

Commands: `npm install`, `docker compose up -d postgres`, `npm run db:generate`, `npm run db:deploy`, `npm run db:seed`, `npm run db:test:consent`, `npm run typecheck`, `npm run lint`, and `npm run dev`.

Open `http://localhost:3000` when that port is available. This environment used `http://localhost:3001` because port 3000 was occupied. Stop PostgreSQL with `docker compose stop postgres`. The current migration contains only core identity and tenancy; authentication and domain modules require later approval.
