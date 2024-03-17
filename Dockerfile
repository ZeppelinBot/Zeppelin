FROM node:20
USER node

COPY --chown=node:node . /zeppelin

# Install dependencies for all packages
WORKDIR /zeppelin
RUN npm ci

# Build backend
WORKDIR /zeppelin/backend
RUN npm run build

# Build dashboard
WORKDIR /zeppelin/dashboard
RUN npm run build

# Prune dev dependencies
WORKDIR /zeppelin
RUN npm prune --production
