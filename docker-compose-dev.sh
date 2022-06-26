#!/bin/bash

DOCKER_UID="$(id -u)" DOCKER_STAY_RUNNING=1 docker-compose --env-file ./.env -f ./docker/development/docker-compose.yml "$@"
