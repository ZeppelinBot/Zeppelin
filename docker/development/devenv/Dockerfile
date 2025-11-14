FROM ubuntu:24.04

ARG DEVELOPMENT_UID
ARG DEVELOPMENT_SSH_PASSWORD

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Set up some core packages
RUN apt-get update
RUN apt-get install -y sudo curl software-properties-common

RUN add-apt-repository ppa:git-core/ppa && apt-get update && apt-get install -y git

# Set up SSH access
RUN apt-get install -y openssh-server iptables
RUN mkdir /var/run/sshd
RUN usermod -G sudo -u $DEVELOPMENT_UID ubuntu
RUN echo "ubuntu:${DEVELOPMENT_SSH_PASSWORD}" | chpasswd

# Install Node.js 24 and packages needed to build native packages
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
RUN apt-get install -y nodejs gcc g++ make python3

# Install pnpm
RUN npm install -g pnpm@10.19.0

CMD ["/usr/sbin/sshd", "-D", "-e"]
