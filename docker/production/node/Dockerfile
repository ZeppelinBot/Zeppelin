FROM node:16.16

ARG DOCKER_USER_UID
ARG DOCKER_USER_GID

# This custom Dockerfile is needed for the Node image so we can change the uid/gid used for the node user
# See https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#non-root-user
RUN groupmod -g "${DOCKER_USER_GID}" node && usermod -u "${DOCKER_USER_UID}" -g "${DOCKER_USER_GID}" node

USER node
