#!/bin/bash

# Update dashboard
cd dashboard
git pull
npm ci
npm run build

# Return
cd ..
