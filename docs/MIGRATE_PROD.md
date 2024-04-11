# Migrating from a version before 30 Mar 2024
Zeppelin's production environment was restructured on 30 Mar 2024. Here's a list of changes to keep in mind when updating to the new version:
* The docker compose file for the production environment is now called `docker-compose.standalone.yml`. There is also a `docker-compose.lightweight.yml` file for different use cases, see [PRODUCTION.md](PRODUCTION.md) for details.
* Env variables in `backend/bot.env` and `backend/api.env` have been consolidated into `.env` at the root directory
  * It is recommended to create a fresh `.env` file based on `.env.example`
* MySQL data is no longer symlinked to `docker/production/data`. This means that when you start the bot for the first time, the database will also be created fresh.
  * To migrate your data, connect to the database and import a database dump
  * If you did not take a backup of your data before updating, check the `volumes` section of the `mysql` service in [docker-compose.production.yml](../docker-compose.production.yml) for instructions on loading the old data folder
* When the production Docker image is being built, files from the bot's folder are now *copied* rather than linked. This means that if you make changes to the files, you need to rebuild the services to see the changes.

If you need help with any of these steps, please join us on the Zeppelin self-hosting community The Hangar at [https://discord.gg/uTcdUmF6Q7](https://discord.gg/uTcdUmF6Q7)!
