#!/bin/bash

nvm use
git pull
npm ci
npm run build
pm2 restart process.json
