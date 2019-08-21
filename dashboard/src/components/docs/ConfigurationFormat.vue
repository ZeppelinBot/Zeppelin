<template>
  <div>
    <h1 class="z-title is-1 mb-1">Configuration format</h1>
    <p class="mb-1">
      This is the basic format of the bot configuration for a guild. The basic breakdown is:
    </p>
    <ol class="z-list mb-1">
      <li>Prefix (i.e. what character is preceding each command)</li>
      <li>Permission levels (see <router-link to="/docs/permissions">Permissions</router-link> for more info)</li>
      <li>Plugin-specific configuration (see <router-link to="/docs/plugin-configuration">Plugin configuration</router-link> for more info)</li>
    </ol>
    <CodeBlock lang="yaml" trim="4">
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

<script>
  import CodeBlock from "./CodeBlock";

  export default {
    components: { CodeBlock },
  };
</script>
