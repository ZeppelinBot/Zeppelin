#!/bin/sh

export NODE_ENV=production

case "$1" in
    migrate) exec pnpm run --silent run:migrate;;
    bot) exec pnpm run --silent run:bot;;
    api) exec pnpm run --silent run:api;;
    dashboard) exec pnpm run --silent run:dashboard;;
    portal) exec pnpm run --silent run:portal;;
    *)
        echo "Unknown command: $1"
        exit 1
        ;;
esac
