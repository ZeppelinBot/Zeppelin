# Zeppelin production environment
Zeppelin's production environment - that is, the **bot, API, and dashboard** - uses Docker.

## Starting the production environment
1. Install Docker on the machine running the bot
2. Make a copy of `.env.example` called `.env`
3. Fill in the missing values in `.env`
4. Run `docker-compose -f docker-compose.production.yml -d up`

## Updating the bot

### One-click script
If you've downloaded the bot's files by cloning the git repository, you can use `update.sh` to update the bot.

### Manual instructions
1. Shut the bot down: `docker-compose -f docker-compose.production.yml down`
2. Update the files (e.g. `git pull`)
3. Start the bot again: `docker-compose -f docker-compose.production.yml -d up`

### Ephemeral hotfixes
If you need to make a hotfix to the bot's source files directly on the server:
1. Shut the bot down: `docker-compose -f docker-compose.production.yml down`
2. Make your edits
3. Start the bot again: `docker-compose -f docker-compose.production.yml -d up`

Note that you can't edit the compiled files directly as they're overwritten when the environment starts.
Only edit files in `/backend/src`, `/shared/src`, and `/dashboard/src`.

Make sure to revert any hotfixes before updating the bot normally.

## View logs
To view real-time logs, run `docker-compose -f docker-compose.production.yml -t logs`
