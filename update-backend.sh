#!/bin/bash

# Stop current processes
pm2 delete process-bot.json
pm2 delete process-api.json

# Run update
git pull
npm ci

cd backend
npm ci
npm run build
npm run migrate-prod

# Start processes again
cd ..
pm2 start process-bot.json
pm2 start process-api.json
