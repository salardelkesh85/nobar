# Nobar on one server (Docker Compose)

The whole marketplace on one Linux server: **edge** (Caddy: HTTPS certificates, the seller and admin panels as
static files) → **web** (the store, a Next.js server) and **api** → **db** (PostgreSQL 17), plus **backup**
(a compressed dump every day). Everything is served from one domain:

| Path | Served by |
|---|---|
| `/` | store |
| `/seller/` | seller panel |
| `/admin/` | admin panel |
| `/v1/…` | API (health, readiness and metrics stay inside the server) |

## Requirements

- A Linux server with Docker Engine and the Compose plugin; 2 CPU and 4 GB RAM is enough to start.
- A domain whose DNS points at the server, with ports 80 and 443 open (the certificate is issued automatically).
- A ZarinPal merchant ID and a Melipayamak panel (user, webservice password, sender line).
- From inside Iran, check that the server reaches `payment.zarinpal.com` and `rest.payamak-panel.com`.

## Install

```bash
cd infra/compose
```

```bash
cp .env.example .env
```

Edit `.env`: domain (`SITE_ADDRESS`, `PUBLIC_URL`), a long `POSTGRES_PASSWORD`, `ADMIN_PHONES`, and the ZarinPal and
Melipayamak settings. Then build and add the secrets (once; keep a copy of `.env` somewhere safe — losing
`KYC_KEY` makes stored national IDs and Sheba numbers unreadable):

```bash
docker compose build
```

```bash
docker compose run --rm --no-deps api node dist/keygen.js >> .env
```

```bash
docker compose up -d
```

Open `https://<your domain>/admin/` and sign in with an admin phone. A fresh market has the categories, produce types
and commission rates and no shops; sellers apply at `/seller/`.

## First checks

1. `docker compose ps` — every service `running` (db `healthy`).
2. Sign in to the store with a real phone: the SMS arrives.
3. Approve a test shop and listing in the admin panel; the listing appears in search and has its own page.
4. Pay a small order through ZarinPal; it appears under orders in the admin panel and the seller gets an SMS.
5. `ls backups/` — a dump is written once the database schema exists, then every day. Copy dumps off the server
   regularly. CI restores a fresh dump into an empty database on every run.

The same flow, automated against stand-ins for ZarinPal and Melipayamak, runs in CI: `ci/smoke.mjs`.

## Operate

| Task | Command |
|---|---|
| Logs | `docker compose logs -f api` |
| Update to a new version | `git pull`, then `docker compose up -d --build` (migrations run on start) |
| Back up now (e.g. before an update) | `docker compose exec backup sh /backup.sh once` |
| Restore a backup | stop the API (`docker compose stop api web`), recreate the database (`docker compose exec db dropdb -U nobar nobar`, then `docker compose exec db createdb -U nobar nobar`), then `gunzip -c backups/nobar-<time>.sql.gz \| docker compose exec -T db psql -U nobar -d nobar -v ON_ERROR_STOP=1`, and `docker compose start api web` |
| Use the assistant with a model | set `LLM_PROVIDER=openai-compatible`, `LLM_BASE_URL`, `LLM_MODEL` in `.env` and `docker compose up -d` |

Behind another TLS terminator or load balancer, set `SITE_ADDRESS=:80`. For more than one server, use the Helm
chart ([docs/deployment.md](../../docs/deployment.md)).
