# Migrating from a version before 30 Mar 2024
Zeppelin's development environment was restructured on 30 Mar 2024. Here's a list of changes to keep in mind when updating to the new version:
* Env variables in `backend/bot.env` and `backend/api.env` have been consolidated into `.env` at the root directory
  * It is recommended to create a fresh `.env` file based on `.env.example`
* MySQL data is no longer symlinked to `docker/development/data`. This means that when you start the dev env for the first time, the database will also be created fresh.
  * The data is now saved to a named Docker volume instead
  * If you need to move over the old data, check the `volumes` section of the `mysql` service in [docker-compose.development.yml](../docker-compose.development.yml) for instructions.
* The recommended dashboard watch command has changed from `npm run watch-build` to `npm run watch`
* If you had made changes to the home folder of the devenv (i.e. `/home/ubuntu` inside the `devenv` container), e.g. by adding SSH keys to `.ssh`, these will need to be re-applied
  * For SSH specifically, it is recommended to use SSH agent forwarding rather than copying key files directly to the container. VS Code and Jetbrains Gateway handle this for you automatically.
