#!/bin/bash

# This wrapper script is used to run different things based on the DEBUG env variable
# Exec is used to forward signals: https://unix.stackexchange.com/a/196053

cd /zeppelin/backend
if [ "$DEBUG" == "true" ]; then
  echo "DEBUG MODE: Starting bot container without starting the bot"
  exec tail -f /dev/null
else
  echo "Starting bot"
  exec npm run start-bot-prod
fi
