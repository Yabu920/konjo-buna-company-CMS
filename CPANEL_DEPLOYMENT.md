# cPanel deployment

## Required runtime

- Node.js `^20.19.0`, `^22.12.0`, or `>=24.0.0`; Node 22.12+ is preferred.
- MySQL/MariaDB database and a least-privilege application user.
- HTTPS and an SMTP provider permitted by the hosting account.
- A persistent writable filesystem directory for uploaded images and gallery videos.

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

## Persistent image and video uploads

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
existing uploads automatically. Gallery videos are streamed to this directory as
MP4 or WebM files, so the Node process does not hold the entire video in memory.
Incomplete `.part` files are removed when validation, streaming, or the client
connection fails.

Set `MAX_VIDEO_UPLOAD_MB` to the approved gallery-video limit. It defaults to 200 MB;
the application refuses startup values above its absolute 300 MB safety cap. The
existing 5 MB image-upload limit is unchanged.

The web server in front of Passenger must permit request bodies at least as large as
the configured application limit. Ask the cPanel provider to confirm the Apache,
LiteSpeed, Nginx, or Passenger request-body limit and request/read timeout before
enabling large uploads. If Apache directives are permitted, `LimitRequestBody` is in
bytes (for example, `209715200` for 200 MB); never raise the proxy above 300 MB for
this application. PHP `upload_max_filesize` does not normally control direct Node.js
requests. Keep `UPLOAD_DIR` on persistent storage with enough free space for a full
upload plus its temporary `.part` file, and include MP4/WebM files in upload backups.

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
image upload, an MP4/WebM gallery upload within the configured limit, and password
recovery over HTTPS. Also verify that an interrupted upload leaves no `.part` file.

Back up the source release, MySQL database, upload directory and encrypted
environment configuration independently before every deployment.
