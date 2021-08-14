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

See https://zeppelin.gg/ for more details.

## Development
These instructions are intended for bot development only.

👉 **No support is offered for self-hosting the bot!** 👈

### Running the bot
1. `cd backend`
2. `npm ci`
3. Make a copy of `bot.env.example` called `bot.env`, fill in the values
4. Run the desired start script:
    * `npm run build` followed by `npm run start-bot-dev` to run the bot in a **development** environment
    * `npm run build` followed by `npm run start-bot-prod` to run the bot in a **production** environment
    * `npm run watch` to watch files and run the **bot and api both** in a **development** environment
      with automatic restart on file changes
5. When testing, make sure you have your test server in the `allowed_guilds` table or the guild's config won't be loaded at all

### Running the API server
1. `cd backend`
2. `npm ci`
3. Make a copy of `api.env.example` called `api.env`, fill in the values
4. Run the desired start script:
    * `npm run build` followed by `npm run start-api-dev` to run the api in a **development** environment
    * `npm run build` followed by `npm run start-api-prod` to run the api in a **production** environment
    * `npm run watch` to watch files and run the **bot and api both** in a **development** environment
      with automatic restart on file changes

### Running the dashboard
1. `cd dashboard`
2. `npm ci`
3. Make a copy of `.env.example` called `.env`, fill in the values
4. Run the desired start script:
    * `npm run build` compiles the dashboard's static files to `dist/` which can then be served with any web server
    * `npm run watch` runs webpack's dev server that automatically reloads on changes

### Notes
* Since we now use shared paths in `tsconfig.json`, the compiled files in `backend/dist/` have longer paths, e.g.
  `backend/dist/backend/src/index.js` instead of `backend/dist/index.js`. This is because the compiled shared files
  are placed in `backend/dist/shared`.
* The `backend/register-tsconfig-paths.js` module takes care of registering shared paths from `tsconfig.json` for
  `ava` and compiled `.js` files
* To run the tests for the files in the `shared/` directory, you also need to run `npm ci` there

### Config format example
Configuration is stored in the database in the `configs` table

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
