FROM node:24 AS build

RUN mkdir /zeppelin
RUN chown node:node /zeppelin

USER node

# Install dependencies before copying over any other files
COPY --chown=node:node package.json package-lock.json /zeppelin
RUN mkdir /zeppelin/backend
COPY --chown=node:node backend/package.json /zeppelin/backend
RUN mkdir /zeppelin/shared
COPY --chown=node:node shared/package.json /zeppelin/shared
RUN mkdir /zeppelin/dashboard
COPY --chown=node:node dashboard/package.json /zeppelin/dashboard

WORKDIR /zeppelin
RUN npm ci

COPY --chown=node:node . /zeppelin

# Build backend
WORKDIR /zeppelin/backend
RUN npm run build

# Build dashboard
WORKDIR /zeppelin/dashboard
RUN npm run build

# Prune dev dependencies
WORKDIR /zeppelin
RUN npm prune --omit=dev

FROM node:24-alpine AS main

USER node
COPY --from=build --chown=node:node /zeppelin /zeppelin
