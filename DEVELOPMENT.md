# Zeppelin development environment
Zeppelin's development environment runs entirely within a Docker container.
Below you can find instructions for setting up the environment and getting started with development!

**Note:** If you'd just like to run the bot for your own server, see 👉 **[PRODUCTION.md](./PRODUCTION.md)** 👈

## Starting the development environment

### Using VSCode devcontainers
1. Install Docker
2. Make a copy of `.env.example` called `.env`
3. Fill in the missing values in `.env`
4. In VSCode: Install the `Remote - Containers` plugin
5. In VSCode: Run `Remote-Containers: Open Folder in Container...` and select the Zeppelin folder

### Using VSCode remote SSH plugin
1. Install Docker
2. Make a copy of `.env.example` called `.env`
3. Fill in the missing values in `.env`
4. Run `docker compose -f docker-compose.development.yml up` to start the development environment
5. In VSCode: Install the `Remote - SSH` plugin
6. In VSCode: Run `Remote-SSH: Connect to Host...`
    * As the address, use `ubuntu@127.0.0.1:3002` (where `3002` matches `DOCKER_DEV_SSH_PORT` in `.env`)
    * Use the password specified in `.env` as `DOCKER_DEV_SSH_PASSWORD`
7. In VSCode: Once connected, click `Open folder...` and select `/home/ubuntu/zeppelin`

### Using JetBrains Gateway
1. Install Docker
2. Make a copy of `.env.example` called `.env`
3. Fill in the missing values in `.env`
4. Run `docker compose -f docker-compose.development.yml up` to start the development environment
5. Choose `Connect via SSH` and create a new connection:
    * Username: `ubuntu`
    * Host: `127.0.0.1`
    * Port: `3002` (matching the `DOCKER_DEV_SSH_PORT` value in `.env`)
6. Click `Check Connection and Continue` and enter the password specified in `.env` as `DOCKER_DEV_SSH_PASSWORD` when asked
7. In the next pane:
    * IDE version: WebStorm, PHPStorm, or IntelliJ IDEA
    * Project directory: `/home/ubuntu/zeppelin`
8. Click `Download and Start IDE`

### Using any other IDE with SSH development support
1. Install Docker
2. Make a copy of `.env.example` called `.env`
3. Fill in the missing values in `.env`
4. Run `docker compose -f docker-compose.development.yml up` to start the development environment
5. Use the following credentials for connecting with your IDE:
    * Host: `127.0.0.1`
    * Port: `3002` (matching the `DOCKER_DEV_SSH_PORT` value in `.env`)
    * Username: `ubuntu`
    * Password: As specified in `.env` as `DOCKER_DEV_SSH_PASSWORD`

## Starting the project

### Starting the backend (bot + api)
These commands are run inside the dev container. You should be able to open a terminal in your IDE after connecting.

1. `cd ~/zeppelin/backend`
2. `npm ci`
3. `npm run migrate-dev`
4. `npm run watch`

### Starting the dashboard
These commands are run inside the dev container. You should be able to open a terminal in your IDE after connecting.

1. `cd ~/zeppelin/dashboard`
2. `npm ci`
3. `npm run watch-build`

### Opening the dashboard
Browse to https://localhost:3300 to view the dashboard
