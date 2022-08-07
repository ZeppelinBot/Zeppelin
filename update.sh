#!/bin/bash

echo Updating Zeppelin...

docker compose -f docker-compose.production.yml stop
git pull
docker compose -f docker-compose.production.yml start

echo Update finished!
