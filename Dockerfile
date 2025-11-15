FROM node:24 AS build

ARG COMMIT_HASH
ARG BUILD_TIME

RUN mkdir /zeppelin
RUN chown node:node /zeppelin

# Install pnpm
RUN npm install -g pnpm@10.19.0

USER node

# Install dependencies before copying over any other files
COPY --chown=node:node package.json pnpm-workspace.yaml pnpm-lock.yaml /zeppelin
RUN mkdir /zeppelin/backend
COPY --chown=node:node backend/package.json /zeppelin/backend
RUN mkdir /zeppelin/shared
COPY --chown=node:node shared/package.json /zeppelin/shared
RUN mkdir /zeppelin/dashboard
COPY --chown=node:node dashboard/package.json /zeppelin/dashboard

WORKDIR /zeppelin
RUN CI=true pnpm install

COPY --chown=node:node . /zeppelin

# Build backend
WORKDIR /zeppelin/backend
RUN pnpm run build

# Build dashboard
WORKDIR /zeppelin/dashboard
RUN pnpm run build

# Only keep prod dependencies
WORKDIR /zeppelin
RUN CI=true pnpm install --prod

# Add version info
RUN echo "${COMMIT_HASH}" > /zeppelin/.commit-hash
RUN echo "${BUILD_TIME}" > /zeppelin/.build-time

# --- Main image ---

FROM node:24-alpine AS main

RUN npm install -g pnpm@10.19.0

USER node
COPY --from=build --chown=node:node /zeppelin /zeppelin

WORKDIR /zeppelin
