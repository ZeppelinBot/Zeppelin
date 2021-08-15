![Zeppelin Banner](assets/zepbanner.png)

# Zeppelin

Zeppelin is a moderation bot for Discord, designed with large servers and reliability in mind.

**Main features include:**

- Extensive automoderator features (automod)
  - Word filters, spam detection, etc.
- Detailed moderator action tracking and notes (cases)
- Customizable server logs
- Tags/custom commands
- Reaction roles
- Tons of utility commands, including a granular member search
- Full configuration via a web dashboard
  - Override specific settings and permissions on e.g. a per-user, per-channel, or per-permission-level basis
- Bot-managed slowmodes
  - Automatically switches between native slowmodes (for 6h or less) and bot-enforced (for longer slowmodes)
- Starboard
- And more!

See <https://zeppelin.gg/> for more details.

## Development

These instructions are intended for bot development only, they are not recommended for self-hosting.

👉 **No support is offered for self-hosting the bot!** 👈

### Running the backend

1. Go into the backend directory: `cd backend`

1. Install dependencies: `npm ci`

1. Make a copy of `bot.env.example` and `api.env.example` (removing the `.example` suffix), fill in the values.
  There are defaults for your convenience, feel free to replace these.

1. Setup the database: `npm run migrate-dev`

1. To start the backend, there are two alternatives:
    - **It is recommended** to use `npm run watch` for development. This will automatically restart on save
    - Run `npm run build` followed by the desired start script:
      - `npm run start-bot-dev` to start the bot.
      - `start-api-dev` to start the api server.

1. On the first run the bot will attempt to add all IDs from `STAFF` in `api.env` into the database

### Running the dashboard

1. Go into the dashboard directory: `cd dashboard`

1. Install dependencies for the dashboard: `npm ci`

1. Make a copy of `.env.example` called `.env`, fill in the values.

1. Run the desired start script:
    - `npm run watch` runs webpack's dev server that automatically reloads on save
    - `npm run build` compiles the dashboard's static files to `dist/` which can then be served with any web server

### Adding configs

There are commands to add new servers and dashboard users, by default the bot has the `!` prefix when
first starting the bot (see [step 6](#Running-the-backend)). Mentioning the bot in a `@Bot` should also work.

The commands do not work in DMs, see the following for how to use them:

- `!add_server` followed by a server ID, and the first user to add as a dashboard user.
  For example `!add_server 473085256233123841 106391128718245888`

- `!add_dashboard_user` followed by a server ID and any amount of users to be added.
  For example `!add_dashboard_user 473085256233123841 347727875266576395 108552944961454080`

- Finally there is `!remove_dashboard_user`, the inverse of `!add_dashboard_user`

### Notes

- Since we now use shared paths in `tsconfig.json`, the compiled files in `backend/dist/` have longer paths, e.g.
  `backend/dist/backend/src/index.js` instead of `backend/dist/index.js`. This is because the compiled shared files
  are placed in `backend/dist/shared`.

- The `backend/register-tsconfig-paths.js` module takes care of registering shared paths from `tsconfig.json` for
  `ava` and compiled `.js` files

- To run the tests for the files in the `shared/` directory, you also need to run `npm ci` there

### Config format example

Configuration is stored in the database in the `configs` table.

```yml
prefix: '!'

# role id: level
levels:
  "12345678": 100 # Example admin
  "98765432": 50 # Example mod

plugins:
  mod_plugin:
    config:
      kick_message: 'You have been kicked'
      can_kick: false
    overrides:
      - level: '>=50'
        config:
          can_kick: true
      - level: '>=100'
        config:
          kick_message: 'You have been kicked by an admin'

  other_plugin:
    config:
      categories:
        mycategory:
          opt: "something"
        othercategory:
          enabled: false
          opt: "hello"
    overrides:
      - level: '>=50'
        config:
          categories:
            mycategory:
              enabled: false
      - channel: '1234'
        config:
          categories:
            othercategory:
              enabled: true
```
