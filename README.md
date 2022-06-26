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
👉 **No support is offered for self-hosting the bot!** 👈

See [DEVELOPMENT.md](./DEVELOPMENT.md) for instructions on running the development environment!

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
