### Config format example

Config files are currently located at `config/<guildId>.yml` (and `config/global.yml` for global plugins).

```yml
levels:
  50: "1234" # Mod role id
  100: "5678" # Admin role id

plugins:
  mod_plugin:
    config:
      kick_message: 'You have been kicked'
    permissions:
      kick: false
    overrides:
      - level: '>=50'
        permissions:
          kick: true
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
