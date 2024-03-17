FROM nginx

ARG STANDALONE_DOMAIN

RUN apt-get update && apt-get install -y openssl
RUN openssl req -x509 -newkey rsa:4096 -keyout /etc/ssl/private/zeppelin-self-signed-cert.key -out /etc/ssl/certs/zeppelin-self-signed-cert.pem -days 3650 -subj "/CN=${STANDALONE_DOMAIN}" -nodes

COPY ./docker/production/nginx/default.conf /etc/nginx/conf.d/default.conf
RUN sed -ir "s/_STANDALONE_DOMAIN_/${STANDALONE_DOMAIN}/g" /etc/nginx/conf.d/default.conf
