FROM node:18
USER node

COPY --chown=node:node . /zeppelin

WORKDIR /zeppelin/backend
RUN ls -lah
RUN pwd
RUN npm ci && npm run build
