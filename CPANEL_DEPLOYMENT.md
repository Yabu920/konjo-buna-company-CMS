# cPanel deployment

## Required runtime

- Node.js `^20.19.0`, `^22.12.0`, or `>=24.0.0`; Node 22.12+ is preferred.
- MySQL/MariaDB database and a least-privilege application user.
- HTTPS and an SMTP provider permitted by the hosting account.
- A persistent writable filesystem directory for uploaded images.

Production fails closed unless `NODE_ENV=production`, `DATA_SOURCE=mysql`, and a
valid MySQL `DATABASE_URL` are configured. JSON is local-development only.

## Install and build

From the application root:

```bash
npm ci
npm run prisma:generate
npm run build
npx prisma validate
npm run prisma:migrate:deploy
```

Use `app.cjs` as the CloudLinux Passenger startup file. It forces production mode
and dynamically imports the ESM bundle at `dist/server.js`. Local production starts
can continue using `npm start`. Actual Passenger compatibility must be confirmed on
the selected hosting account.

## Persistent uploads

Set `UPLOAD_DIR` to an absolute path outside directories replaced during releases,
for example `/home/CPANEL_USER/konjo-shared/uploads`. Relative paths resolve from
the application process working directory. Keep `PUBLIC_UPLOAD_PATH=/uploads` to
preserve all existing database URLs.

Before the first start, create the directory, give the Node application user read
and write permission, and copy existing files without deleting their source copies:

```bash
mkdir -p /home/CPANEL_USER/konjo-shared/uploads
cp -p uploads/* /home/CPANEL_USER/konjo-shared/uploads/
```

Replace the placeholder account name with the real cPanel account. Verify the copy
and back it up before changing releases. The application never moves or deletes
existing images automatically.

## Passenger proxy trust

`TRUST_PROXY=false` is the safe default. Ask the provider for the exact Passenger
or reverse-proxy IP/CIDR and configure only that value. `loopback` is appropriate
only when the verified proxy connects over loopback. A numeric value such as `1`
is acceptable only if the application port is inaccessible directly and every
request has exactly one proxy hop. Broad values (`true`, `*`, `0.0.0.0/0`, `::/0`)
are rejected.

Enable `HSTS_ENABLED=true` only after the final domain is HTTPS-only and proxy
forwarding has been verified. Otherwise leave it false.

## Environment variables

Configure every production variable listed in `.env.example` through cPanel. Do
not upload the local `.env`. Use a canonical HTTPS `APP_URL` and real SMTP provider;
Mailtrap Sandbox is not a production mail service.

## Restart and smoke test

Restart through cPanel or create/touch `tmp/restart.txt` as supported by Passenger.
Verify `/api/health`, public APIs, admin login/logout, CSRF-protected CMS writes,
image upload and password recovery over HTTPS.

Back up the source release, MySQL database, upload directory and encrypted
environment configuration independently before every deployment.
