FROM nginx

ARG API_PORT
ARG DOCKER_DEV_API_PORT
ARG DOCKER_DEV_DASHBOARD_PORT

RUN apt-get update && apt-get install -y openssl
RUN openssl req -x509 -newkey rsa:4096 -keyout /etc/ssl/private/localhost-cert.key -out /etc/ssl/certs/localhost-cert.pem -days 3650 -subj '/CN=localhost' -nodes

COPY ./default.conf /etc/nginx/conf.d/default.conf
RUN sed -ir "s/_API_PORT_/${API_PORT}/g" /etc/nginx/conf.d/default.conf
