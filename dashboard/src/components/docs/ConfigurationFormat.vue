<template>
  <div>
    <h1>Configuration format</h1>
    <p>
      This is the basic format of the bot configuration for a guild. The basic breakdown is:
    </p>

    <ul>
      <li>Prefix (i.e. what character is preceding each command)</li>
      <li>Permission levels (see <router-link to="/docs/configuration/permissions">Permissions</router-link> for more info)</li>
      <li>Plugin-specific configuration (see <router-link to="/docs/configuration/plugin-configuration">Plugin configuration</router-link> for more info)</li>
    </ul>

    <CodeBlock code-lang="yaml" trim="start">
      prefix: "!"

      # role id: level
      levels:
        "172949857164722176": 100 # Example admin
        "172950000412655616": 50 # Example mod

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
    </CodeBlock>
  </div>
</template>

<script lang="ts">
  import CodeBlock from "./CodeBlock.vue";

  export default {
    components: { CodeBlock },
  };
</script>
