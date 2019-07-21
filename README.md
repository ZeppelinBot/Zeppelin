# Development
These instructions are intended for bot development only.

👉 **No support is offered for self-hosting the bot!** 👈

## Running the bot
1. `npm ci`
2. Make a copy of `bot.env.example` called `bot.env`, fill in the values
3. Run the desired start script:  
\- `npm run start-bot-dev` to run the bot with `ts-node`  
\- `npm run build` followed by `npm run start-bot-prod` to run the bot compiled  
\- `npm run watch-bot` to run the bot with `ts-node` and restart on changes
4. When testing, make sure you have your test server in the `allowed_guilds` table or the guild's config won't be loaded at all

## Running the API server
1. `npm ci`
2. Make a copy of `api.env.example` called `api.env`, fill in the values
3. Run the desired start script:  
\- `npm run start-api-dev` to run the API server with `ts-node`  
\- `npm run build` followed by `npm run start-api-prod` to run the API server compiled  
\- `npm run watch-api` to run the API server with `ts-node` and restart on changes

## Running the dashboard
1. Navigate to `dashboard/`
2. `npm ci`
3. Make a copy of `.env.example` called `.env`, fill in the values
4. Run the desired start script:  
\- `npm run build` compiled the dashboard's static files in `dist/` which can then be served with any web server  
\- `npm run watch` runs Parcel.js's dev server that automatically reloads on changes

## Config format example
Configuration is stored in the database in the `configs` table

```yml
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
  spam:
    config:
      filter_words: ['heck']
    overrides:
      - channel: '1234'
        config:
          +filter_words: ['foo']
      - level: '>=50'
        config:
          -filter_words: ['heck']
```
