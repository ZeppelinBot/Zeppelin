# Management
After starting Zeppelin -- either in the [development](./DEVELOPMENT.md) or [production](./PRODUCTION.md) environment -- you have several tools available to manage it.

## Note
Make sure to add yourself to the list of staff members (`STAFF`) in `.env` and allow at least one server by default (`DEFAULT_ALLOWED_SERVERS`). Then, invite the bot to the server.

In all examples below, `@Bot` refers to a user mention of the bot user. Make sure to run the commands on a server with the bot, in a channel that the bot can see.

In the command parameters, `<this>` refers to a required parameter (don't include the `< >` symbols) and `[this]` refers to an optional parameter (don't include the `[ ]` symbols). `<this...>` refers to being able to list multiple values, e.g. `value1 value2 value3`.

## Bot Access
When specifying a user ID, that user will be given "Bot manager" level access to the server's dashboard, allowing them to manage access for other users.

- Allow a server to invite the bot: `@Bot allow_server <serverId> [userId]`
- Disallow a server: `@Bot disallow_server <serverId>`

## Dashboard Access
- Grant access to a server's dashboard: `@Bot add_dashboard_user <serverId> <userId...>`
- Remove access to a server's dashboard: `@Bot remove_dashboard_user <serverId> <userId...>`
