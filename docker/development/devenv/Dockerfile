FROM ubuntu:20.04

ARG DOCKER_UID

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Set up SSH access
RUN apt-get update && apt-get install -y openssh-server sudo git
RUN mkdir /var/run/sshd
RUN useradd -rm -d /home/ubuntu -s /bin/bash -g root -G sudo -u "${DOCKER_UID}" ubuntu
RUN echo 'ubuntu:password' | chpasswd

# Install Node.js 16
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

CMD /usr/sbin/sshd -D -e
