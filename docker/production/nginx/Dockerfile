FROM node:18 AS builder
USER node

COPY --chown=node:node . /zeppelin

WORKDIR /zeppelin/dashboard
RUN ls -lah
RUN pwd
RUN npm ci && npm run build

FROM nginx

ARG API_PORT
ARG DOCKER_PROD_DOMAIN

RUN apt-get update && apt-get install -y openssl
RUN openssl req -x509 -newkey rsa:4096 -keyout /etc/ssl/private/zeppelin-self-signed-cert.key -out /etc/ssl/certs/zeppelin-self-signed-cert.pem -days 3650 -subj "/CN=${DOCKER_PROD_DOMAIN}" -nodes

COPY ./docker/production/nginx/default.conf /etc/nginx/conf.d/default.conf
RUN sed -ir "s/_API_PORT_/${API_PORT}/g" /etc/nginx/conf.d/default.conf
RUN sed -ir "s/_DOCKER_PROD_DOMAIN_/${DOCKER_PROD_DOMAIN}/g" /etc/nginx/conf.d/default.conf

COPY --from=builder /zeppelin/dashboard/dist /var/www
