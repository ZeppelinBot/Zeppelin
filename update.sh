#!/bin/bash

echo Updating Zeppelin...

docker compose -f docker-compose.production.yml stop
git pull
if [ $? -ne 0 ]; then
  echo "git pull failed. exiting."
  exit 1
fi
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d

echo Update finished!
