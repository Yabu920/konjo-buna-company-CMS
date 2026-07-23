# Konjo Buna website and CMS

React + Vite frontend with an Express API. Production uses MySQL through Prisma.
Authentication uses server-managed cookie sessions; there is no JWT client token.

## Local development

1. Copy `.env.example` to `.env` and configure placeholders.
2. Use `DATA_SOURCE=mysql` with a valid `DATABASE_URL`, or explicitly select
   `DATA_SOURCE=json` for local-only JSON development.
3. Run `npm ci`, `npm run prisma:generate`, and `npm run dev`.

JSON mode stores runtime data in ignored `database.local.json` by default and seeds
public CMS content from sanitized `database.json`. It contains no administrator.
To create a local JSON administrator, set all four `JSON_BOOTSTRAP_*` variables.
The password must be at least 12 characters, must not contain the username, and
must not use a predictable administrative prefix. Credentials are never printed.
JSON mode and JSON bootstrap are rejected in production.

## Verification

```bash
npm test
npm run lint
npm run build
npm run prisma:generate
npx prisma validate
npx prisma migrate status
npm run prisma:verify-repository
```

See [CPANEL_DEPLOYMENT.md](CPANEL_DEPLOYMENT.md) for production configuration,
persistent uploads, proxy trust, migrations, startup and rollback guidance.
