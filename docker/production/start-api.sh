#!/bin/bash

# This wrapper script is used for two purposes:
# 1. Waiting for the prepare_backend container to finish before starting (see https://github.com/docker/compose/issues/5007#issuecomment-335815508)
# 2. Forwarding signals to the app (see https://unix.stackexchange.com/a/196053)

# Wait for the backend preparations to finish before continuing
echo "Waiting for prepare_backend to finish before starting the API..."
while ping -c1 prepare_backend &>/dev/null; do sleep 1; done;

cd /zeppelin/backend
if [ -n "$DEBUG" ]; then
  echo "Starting API in debug mode"
  exec env NO_INSIGHT=true npm run start-api-prod-debug
else
  echo "Starting API"
  exec npm run start-api-prod
fi
