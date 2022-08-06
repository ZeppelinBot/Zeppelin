#!/bin/bash

# Run hotfix update
cd backend
git pull
npm run build

# Restart processes
cd ..
nvm use
pm2 restart process-bot.json
pm2 restart process-api.json
