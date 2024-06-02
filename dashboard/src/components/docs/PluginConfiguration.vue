<template>
  <div>
    <h1>Plugin configuration</h1>
    <p>
      Most plugins in Zeppelin have configurable options. The values for these options come from 3 places:
    </p>
    <ol>
      <li>
        <strong>Default options</strong> (from Zeppelin)
      </li>
      <li>
        <strong>Custom options</strong> (set by you in config)
      </li>
      <li>
        <strong>Overrides</strong> (conditional config values, see below)
      </li>
    </ol>
    <p>
      Permissions are also just regular config options with a <code>true</code>/<code>false</code> value.
      <router-link to="/docs/configuration/permissions">See the Permissions page for more info.</router-link>
    </p>
    <p>
      Information about each plugin's options can be found on the plugin's page, which can be accessed from the sidebar.
      <router-link to="/docs/configuration/configuration-format">See the Configuration format page for an example of a full config.</router-link>
    </p>

    <h2>Overrides</h2>
    <p>
      Overrides are the primary mechanism of changing options and permissions based on permission levels, roles,
      channels, user ids, etc.
    </p>

    <Expandable class="wide">
      <template v-slot:title>Click to see examples of different types of overrides</template>
      <template v-slot:content>
        <CodeBlock code-lang="yaml">
          plugins:
            example_plugin:
              config:
                can_kick: false
                kick_message: "You have been kicked"
                nested:
                  value: "Hello"
                  other_value: "Foo"
              overrides:
                # Simple permission level based override to allow kicking only for levels 50 and up
                - level: '>=50'
                  config:
                    can_kick: true
                    nested:
                      # This only affects nested.other_value; nested.value is still "Hello"
                      other_value: "Bar"
                # Channel override - don't allow kicking on the specified channel
                - channel: "109672661671505920"
                  config:
                    can_kick: false
                # Don't allow kicking on any thread
                - is_thread: true
                  config:
                    can_kick: false
                # Don't allow kicking on a specific thread
                - thread_id: "109672661671505920"
                  config:
                    can_kick: false
                # Same as above, but for a full category
                - category: "360735466737369109"
                  config:
                    can_kick: false
                # Multiple channels. If any of them match, this override applies.
                - channel: ["109672661671505920", "570714864285253677"]
                  config:
                    can_kick: false
                # Match based on a role
                - role: "172950000412655616"
                  config:
                    can_kick: false
                # Match based on multiple roles. The user must have ALL roles mentioned here for this override to apply.
                - role: ["172950000412655616", "172949857164722176"]
                  config:
                    can_kick: false
                # Match on user id
                - user: "106391128718245888"
                  config:
                    kick_message: "You have been kicked by Dragory"
                # Match on multiple conditions
                - channel: "109672661671505920"
                  role: "172950000412655616"
                  config:
                    can_kick: false
                # Match on ANY of multiple conditions
                - any:
                  - channel: "109672661671505920"
                  - role: "172950000412655616"
                  config:
                    can_kick: false
                # Match on either of two complex conditions
                - any:
                  - all:
                    - channel: "109672661671505920"
                      role: "172950000412655616"
                    - not:
                        role: "473085927053590538"
                  - channel: "534727637017559040"
                    role: "473086848831455234"
                  config:
                    can_kick: false
        </CodeBlock>
      </template>
    </Expandable>

    <h2>Default overrides</h2>
    <p>
      Many plugins have some overrides by default, usually for the default mod level (50) and/or the default admin level
      (100). These are applied before any custom overrides in the config.
    </p>
    <p>
      You can see the default overrides for each plugin by checking the <strong>Default configuration section</strong>
      under the <strong>Configuration tab</strong> on the plugin's documentation page.
    </p>
    <p>
      To replace a plugin's default overrides entirely, set <code>replaceDefaultOverrides</code> to <code>true</code> in
      plugin options, on the same level as <code>config</code> and <code>overrides</code>. In the following example, any
      default overrides the plugin had will no longer have an effect:
    </p>

    <CodeBlock code-lang="yaml">
      example_plugin:
        config:
          can_kick: false
        replaceDefaultOverrides: true # <-- Here
        overrides:
          - level: ">=25"
            config:
              can_kick: true
    </CodeBlock>
  </div>
</template>

<script lang="ts">
  import CodeBlock from "./CodeBlock.vue";
  import Expandable from "../Expandable.vue";

  export default {
    components: { CodeBlock, Expandable },
  };
</script>
