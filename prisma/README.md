# Prisma / MySQL foundation

This directory defines the future MySQL schema. The running application still uses
`database.json` through `server/db.ts`; Prisma is not imported by the server yet.

## Configure cPanel MySQL

1. Create a MySQL database and user in cPanel and grant the user all privileges on
   that database.
2. Copy `.env.example` to `.env` and fill in the MySQL values.
3. Set `DATABASE_URL` using this format:

   `mysql://USER:PASSWORD@HOST:3306/DATABASE`

   URL-encode special characters in the username or password.

## Prepare the schema

- `npm run prisma:generate` generates the Prisma client.
- `npm run prisma:migrate -- --name init` creates and applies the initial migration.

Always back up an existing database before applying a migration. The application
continues to use `database.json`; running these commands does not switch the Express
CRUD layer to MySQL.

## Validate and import database.json

Run validation without connecting to or writing to MySQL:

`npm run prisma:import-json -- --dry-run`

After the migration exists in the target database and the dry run has no critical
errors, run the transactional, idempotent import:

`npm run prisma:import-json`

The importer preserves string IDs and bilingual content, uses upserts, normalizes
subscriber emails, converts empty inquiry product IDs to `NULL`, validates relations,
and rolls back the transaction if a real import fails.

## Inspect imported data

Open Prisma Studio with:

`npm run prisma:studio`

The importer does not modify or delete `database.json`.

## Parallel Prisma repository

`server/prisma.ts` provides the shared Prisma client and MySQL adapter. The parallel
`server/db-prisma.ts` repository implements asynchronous Prisma equivalents of the
current JSON `DBManager` methods.

The Prisma repository is prepared but is **not active**. `server.ts` still imports
`server/db.ts`, so the running application continues to read and write
`database.json`. The real route switch belongs to Step 4 after repository review.

After migrating and importing a configured MySQL database, verify the repository's
read operations with:

`npm run prisma:verify-repository`

This verification command reads categories, products, and settings without writing
data.

## Step 4 data-source switch

The Express API now selects its repository through `server/db-adapter.ts`:

- `DATA_SOURCE=json` uses `server/db.ts` and `database.json` (safe default).
- `DATA_SOURCE=mysql` uses `server/db-prisma.ts` and the configured MySQL database.
- A missing or unrecognized value falls back to JSON.

Only switch to MySQL after the schema migration, JSON import, and repository
verification have succeeded. Restart the Node application after changing the value.

### API test checklist for both modes

Run the same checks first with `DATA_SOURCE=json`, then with `DATA_SOURCE=mysql`:

- Public products and product detail
- Public services and service detail
- Public news and news detail
- Gallery
- Contact inquiry submission
- Newsletter subscription
- Admin login and protected reads
- Admin create, update, and delete operations for each managed content type
- Inquiry status update and subscriber deletion
- Site settings update

## Emergency admin password reset

The reset command uses the active `DATA_SOURCE` and hashes the new password with bcrypt:

`npm run admin:reset-password -- --username admin --password NewStrongPassword123`

Use `DATA_SOURCE=mysql` for the deployed MySQL database or `DATA_SOURCE=json` for the
local JSON repository. The command never prints the password hash.

## Step 7A authentication migration

Apply the authentication-only migration before starting the cookie-session backend:

`npm run prisma:migrate:deploy`

It adds a unique nullable admin email and the `admin_sessions` and
`password_reset_tokens` tables. Configure `APP_URL`, `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` for Super Admin email recovery.
