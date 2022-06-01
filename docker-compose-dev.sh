#!/bin/bash

DOCKER_UID="$(id -u)" DOCKER_GID="$(id -g)" docker-compose --env-file ./.env -f ./docker/development/docker-compose.yml "$@"
