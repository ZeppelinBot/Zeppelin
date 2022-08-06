#!/bin/bash

echo Updating Zeppelin...

docker-compose -f docker-compose.production.yml down
git pull
docker-compose -f docker-compose.production.yml -d up

echo Update finished!
