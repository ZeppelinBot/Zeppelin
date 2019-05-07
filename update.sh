#!/bin/bash

# Load nvm
. ~/.nvm/nvm.sh

# Run update
nvm use
git pull
npm ci
npm run build
pm2 restart process.json
