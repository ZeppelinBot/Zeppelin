#!/bin/bash

echo Updating Zeppelin...

docker compose -f docker-compose.production.yml stop
git pull
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d

echo Update finished!
