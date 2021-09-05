#!/bin/bash

# Load nvm
. ~/.nvm/nvm.sh

# Stop current processes
nvm use
pm2 delete process-bot.json
pm2 delete process-api.json

# Run update
nvm use
git pull
npm ci

cd backend
npm ci
npm run build
npm run migrate-prod

# Start processes again
cd ..
nvm use
pm2 start process-bot.json
pm2 start process-api.json
