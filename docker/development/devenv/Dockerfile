FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Set up some core packages
RUN apt-get update
RUN apt-get install -y sudo curl software-properties-common

RUN add-apt-repository ppa:git-core/ppa && apt-get update && apt-get install -y git

# Install Node.js 24 and packages needed to build native packages
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
RUN apt-get install -y nodejs gcc g++ make python3

# Install pnpm
RUN npm install -g --min-release-age=7 pnpm

# Delete default sudo user and create unprivileged user
RUN userdel -r ubuntu
RUN useradd -m -s /bin/bash dev

# Install sshd
RUN apt-get install -y openssh-server

COPY --chmod=0755 ./entrypoint.sh /usr/bin/entrypoint.sh

# Entrypoint drops us to unprivileged user
USER root

ENTRYPOINT ["/bin/bash", "/usr/bin/entrypoint.sh"]
CMD ["sleep", "infinity"]
