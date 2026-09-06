# Parked: Prisma-Next / Postgres experiment

These files are an unfinished migration to the experimental `@prisma/orm-postgres`
("Prisma Next") client. They are NOT wired into the running app and are kept here
for reference only.

The live app uses the stable Prisma 6 client with SQLite — see `/prisma/schema.prisma`
and `src/services/toolsService.js`.

Do not put `prisma.config.ts` back at the repo root: the stable Prisma 6 CLI
auto-loads it and fails because `@prisma/orm-postgres` is not a dependency.
