FROM nginx

RUN apt-get update && apt-get install -y openssl
RUN openssl req -x509 -newkey rsa:4096 -keyout /etc/ssl/private/localhost-cert.key -out /etc/ssl/certs/localhost-cert.pem -days 3650 -subj '/CN=localhost' -nodes

COPY ./docker/production/nginx/default.conf /etc/nginx/conf.d/default.conf
