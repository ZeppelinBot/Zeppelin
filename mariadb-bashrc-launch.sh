#!/bin/bash

# this script is intended to be called from .bashrc
# This is a workaround for not having something like supervisord

if [ ! -e /var/run/mariadb/gitpod-init.lock ]
then
    touch /var/run/mariadb/gitpod-init.lock

    # initialize database structures on disk, if needed
    [ ! -d /workspace/mariadb ] && mariadb --initialize-insecure

    # launch database, if not running
    [ ! -e /var/run/mariadb/mariadb.pid ] && mariadb --daemonize

    rm /var/run/mariadb/gitpod-init.lock
fi
