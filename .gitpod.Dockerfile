FROM gitpod/workspace-full:latest

USER root

# Install mariadb
RUN apt-get update \
 && apt-get install -y mariadb-server \
 && apt-get clean && rm -rf /var/cache/apt/* /var/lib/apt/lists/* /tmp/* \
 && mkdir /var/run/mariadb \
 && chown -R gitpod:gitpod /etc/mariadb /var/run/mariadb /var/log/mariadb /var/lib/mariadb /var/lib/mariadb-files /var/lib/mariadb-keyring /var/lib/mariadb-upgrade

# Install our own mariadb config
COPY mariadb.cnf /etc/mariadb/mariadb.conf.d/mariadb.cnf

# Install default-login for mariadb clients
COPY client.cnf /etc/mariadb/mariadb.conf.d/client.cnf

COPY mariadb-bashrc-launch.sh /etc/mariadb/mariadb-bashrc-launch.sh

USER gitpod

RUN echo "/etc/mariadb/mariadb-bashrc-launch.sh" >> ~/.bashrc

RUN bash -c ". .nvm/nvm.sh \
    && nvm install 14 \
    && nvm use 14 \
    && nvm alias default 14"

RUN echo "nvm use default &>/dev/null" >> ~/.bashrc.d/51-nvm-fix
