# Running the development environment
1. Install Docker
2. Make a copy of `.env.example` called `.env`
3. Fill in the missing values in `.env`
4. Run `./docker-compose-dev.sh up` to start the development environment
5. Connect to the development environment with your editor's remote SSH feature (see below)

## Connecting with VSCode
1. Install the `Remote - SSH` plugin
2. Run `Remote-SSH: Connect to Host...`
    * As the address, use `ubuntu@127.0.0.1:3002` (where `3002` matches `DOCKER_DEV_SSH_PORT` in `.env`)
    * Use the password specified in `.env` as `DOCKER_DEV_SSH_PASSWORD`
3. Once connected, click `Open folder...` and select `/home/ubuntu/zeppelin`

## Connecting with JetBrains Gateway
* TODO (basically the same as VSCode instructions though)

## Starting the backend (bot + api)
These commands are run inside the dev container. You should be able to just open a terminal in your editor after connecting.
1. `cd ~/zeppelin/backend`
2. `npm ci`
3. `npm run migrate-dev`
4. `npm run watch`

## Starting the dashboard
1. `cd ~/zeppelin/dashboard`
2. `npm ci`
3. `npm run watch-build`

## Opening the dashboard
Browse to https://localhost:3300 to view the dashboard
