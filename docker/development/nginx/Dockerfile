FROM nginx

ARG API_DOMAIN
ARG DASHBOARD_DOMAIN

RUN apt-get update && apt-get install -y openssl
RUN openssl req -x509 -newkey rsa:4096 -keyout /etc/ssl/private/api-cert.key -out /etc/ssl/certs/api-cert.pem -days 365 -subj '/CN=*.${API_DOMAIN}' -nodes
RUN openssl req -x509 -newkey rsa:4096 -keyout /etc/ssl/private/dashboard-cert.key -out /etc/ssl/certs/dashboard-cert.pem -days 365 -subj '/CN=*.${DASHBOARD_DOMAIN}' -nodes

COPY ./default.conf /etc/nginx/conf.d/default.conf
RUN sed -ir "s/_API_DOMAIN_/$(echo ${API_DOMAIN} | sed -ir 's///g')/g"
RUN sed -ir "s/_DASHBOARD_DOMAIN_/$(echo ${DASHBOARD_DOMAIN} | sed 's/\./\\\\./g')/g"
