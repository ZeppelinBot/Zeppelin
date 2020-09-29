<template>
  <div>
    <h1>Permissions</h1>
    <p>
      Permissions in Zeppelin are simply values in plugin configuration that are checked when the command is used.
      These values can be changed with overrides (see <router-link to="/docs/configuration/plugin-configuration">Plugin configuration</router-link> for more info)
      and can depend on e.g. user id, role id, channel id, category id, or <strong>permission level</strong>.
    </p>

    <h2>Permission levels</h2>
    <p>
      The simplest way to control access to bot commands and features is via permission levels.
      These levels are simply a number (usually between 0 and 100), based on the user's roles or user id, that can then
      be used in permission overrides. By default, several commands are "moderator only" (level 50 and up) or "admin only" (level 100 and up).
    </p>
    <p>
      Additionally, having a higher permission level means that certain commands (such as !ban) can't be used against
      you by users with a lower or equal permission level (so e.g. moderators can't ban each other or admins above them).
    </p>
    <p>
      Permission levels are defined in the config in the <strong>levels</strong> section. For example:
    </p>

    <CodeBlock code-lang="yaml">
      # "role/user id": level
      levels:
        "172949857164722176": 100 # Example admin
        "172950000412655616": 50 # Example mod
    </CodeBlock>

    <h2>Examples</h2>

    <h3>Basic overrides</h3>
    <p>
      For this example, let's assume we have a plugin called <code>cats</code> which has a command <code>!cat</code> locked behind the permission <code>can_cat</code>.
      Let's say that by default, the plugin allows anyone to use <code>!cat</code>, but we want to restrict it to moderators only.
    </p>
    <p>
      Here's what the configuration for this would look like:
    </p>

    <CodeBlock code-lang="yaml">
      plugins:
        cats:
          config:
            can_cat: false # Here we set the permission false by default
          overrides:
            # In this override, can_cat is changed to "true" for anyone with a permission level of 50 or higher
            - level: ">=50"
              config:
                can_cat: true
    </CodeBlock>

    <h3>Replacing defaults</h3>
    <p class="mb-1">
      In this example, let's assume you don't want to use the default permission levels of 50 and 100 for mods and admins respectively.
      Let's say you're using various incremental levels instead: 10, 20, 30, 40, 50...<br>
      We want to make it so moderator commands are available starting at level 70.
      Additionally, we'd like to reserve banning for levels 90+ only.
      To do this, we need to <strong>replace</strong> the default overrides that enable moderator commands at level 50.
    </p>
    <p class="mb-1">
      Here's what the configuration for this would look like:
    </p>

    <CodeBlock code-lang="yaml">
      plugins:
        mod_actions:
          replaceDefaultOverrides: true
          overrides: # The "=" here means "replace any defaults"
            - level: ">=70"
              config:
                can_warn: true
                can_mute: true
                can_kick: true
            - level: ">=90"
              config:
                can_ban: true
    </CodeBlock>
  </div>
</template>

<script>
  import CodeBlock from "./CodeBlock";

  export default {
    components: { CodeBlock },
  };
</script>
