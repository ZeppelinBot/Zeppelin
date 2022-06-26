FROM ubuntu:20.04

ARG DOCKER_DEV_UID
ARG DOCKER_DEV_SSH_PASSWORD

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Set up some core packages
RUN apt-get update
RUN apt-get install -y sudo git curl

# Set up SSH access
RUN apt-get install -y openssh-server iptables
RUN mkdir /var/run/sshd
RUN useradd -rm -d /home/ubuntu -s /bin/bash -g root -G sudo -u $DOCKER_DEV_UID ubuntu
RUN echo "ubuntu:${DOCKER_DEV_SSH_PASSWORD}" | chpasswd

# Set up proper permissions for volumes
RUN mkdir -p /home/ubuntu/zeppelin /home/ubuntu/.vscode-remote /home/ubuntu/.vscode-server /home/ubuntu/.cache/JetBrains
RUN chown -R ubuntu /home/ubuntu

# Install Node.js 16 and packages needed to build native packages
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs gcc g++ make python3

CMD /usr/sbin/sshd -D -e
