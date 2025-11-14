# Zeppelin production environment

⚠️ **Updating from before 30 Mar 2024? See [MIGRATE_PROD.md](./MIGRATE_PROD.md) for instructions.**

Zeppelin's production environment uses Docker. There are a few different ways to run Zeppelin in production:

1. **Standalone**
  * The easiest way to get Zeppelin up and running. This setup comes with a built-in database and web server.
2. **Lightweight**
  * In case you don't want to use the built-in database and web server. This setup only runs the bot, API, and dashboard themselves. You'll have to provide your own database connection options and set up a proxy server for the API and dashboard.
3. **Manual**
  * If you only want to run a specific service, you can use Zeppelin's Dockerfile directly.

## Standalone

### Setup
1. Install Docker on the machine running the bot
2. Make a copy of `.env.example` called `.env`
3. Fill in the missing values in `.env` (including the "PRODUCTION - STANDALONE" section)

**Note:** The dashboard and API are served insecurely over HTTP. It is recommended to set up a proxy with a TLS certificate in front of them. A popular option for this is [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/).

### Running the bot
`docker compose -f docker-compose.standalone.yml up -d`

### Shutting the bot down
`docker compose -f docker-compose.standalone.yml down`

### Updating the bot
1. Shut the bot down
2. Update the files (e.g. `git pull`)
3. Update images: `docker compose -f docker-compose.standalone.yml pull`
4. Rebuild: `docker compose -f docker-compose.standalone.yml build`
5. Run the bot again

### Viewing logs
`docker compose -f docker-compose.standalone.yml logs -t -f`

## Lightweight

### Setup
1. Install Docker on the machine running the bot
2. Make a copy of `.env.example` called `.env`
3. Fill in the missing values in `.env` (including the "PRODUCTION - LIGHTWEIGHT" section)

### Running the bot
`docker compose -f docker-compose.lightweight.yml up -d`

### Shutting the bot down
`docker compose -f docker-compose.lightweight.yml down`

### Updating the bot
1. Shut the bot down
2. Update the files (e.g. `git pull`)
3. Update images: `docker compose -f docker-compose.standalone.yml pull`
4. Rebuild: `docker compose -f docker-compose.lightweight.yml build`
5. Run the bot again

### Viewing logs
`docker compose -f docker-compose.lightweight.yml logs -t -f`

## Manual
1. Build the Zeppelin image: `docker build --tag 'zeppelin' .`
2. Run the service:
  * Bot: `docker run zeppelin pnpm run start-bot`
  * API: `docker run zeppelin pnpm run start-api`
  * Dashboard: `docker run zeppelin pnpm run start-dashboard`

If you're using an application platform such as Railway, you can simply point it to Zeppelin's repository and it should pick up the Dockerfile from there.
For the start command, you can use the same commands as above: `pnpm run start-bot`, `pnpm run start-api`, `pnpm run start-dashboard`.
Make sure to also run migrations when you update the bot.

### Environment variables
You'll need to provide the necessary env variables in the manual setup. For example, `docker run -e NODE_ENV=production --env-file .env zeppelin`

The following env variables can be used to set up the database credentials:
* `DB_HOST`
* `DB_PORT`
* `DB_USER`
* `DB_PASSWORD`
* `DB_DATABASE`

The following env variable can be used to configure the API path prefix:
* `API_PATH_PREFIX`

Remember to always set `NODE_ENV` to `production` for production setups.
