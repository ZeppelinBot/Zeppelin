#!/bin/bash

# Load nvm
. ~/.nvm/nvm.sh

# Run hotfix update
cd backend
nvm use
git pull
npm run build

# Restart processes
cd ..
nvm use
pm2 restart process-bot.json
pm2 restart process-api.json
