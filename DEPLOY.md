# Deploying Fin on your own VPS 🖥️

This is the recommended way to run Fin. Everything — the app, the Postgres
database, and automatic HTTPS — runs in Docker containers, so the whole thing
comes up with one command. No external database or serverless account needed.

## Prerequisites

- A VPS (Ubuntu/Debian etc.) with a public IP.
- A domain name with a DNS **A-record** pointing to the VPS IP
  (e.g. `fin.example.com`). HTTPS — and the iOS lockscreen widget — require this.
- Ports **80** and **443** open.
- **Docker** + **Docker Compose** installed:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```

## Deploy

```bash
# 1. Get the code
git clone https://github.com/lukashertweck-debug/AI_Advisor.git
cd AI_Advisor

# 2. Configure
cp .env.deploy.example .env
nano .env                       # set DOMAIN, POSTGRES_PASSWORD, AUTH_SECRET
# generate a secret:  openssl rand -base64 32

# 3. Launch (builds the image, starts db + app + caddy)
docker compose up -d --build
```

That's it. Caddy automatically fetches a Let's Encrypt certificate for your
domain, so after a minute visit **https://your-domain** and create your account.
The app creates its own database tables on first run.

## Updating later

```bash
git pull
docker compose up -d --build
```

Your data lives in the `pgdata` Docker volume and survives rebuilds.

## Handy commands

```bash
docker compose logs -f app      # app logs
docker compose logs -f caddy    # HTTPS / cert logs
docker compose ps               # container status
docker compose down             # stop everything (keeps data)
```

## Backups

```bash
# Dump the database
docker compose exec db pg_dump -U fin fin > fin-backup-$(date +%F).sql

# Restore
cat fin-backup.sql | docker compose exec -T db psql -U fin fin
```

## Notes

- **Lockscreen widget / Telegram** both need the public HTTPS URL — that's your
  `DOMAIN`, which this setup gives you out of the box.
- To change integration keys (Google, Anthropic, Telegram), edit `.env` and run
  `docker compose up -d` again.
- Prefer a managed host instead? The app also deploys to Vercel — see the README
  (you'd use a hosted Postgres like Neon there, since Vercel has no persistent
  disk).
