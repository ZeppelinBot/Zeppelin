<template>
  <div>
    <h1>Mod actions</h1>
    <p>
      Name in config: <code>mod_actions</code>
    </p>

    <h2>Default configuration</h2>
    <CodeBlock lang="yaml" trim="4">
      config:
        dm_on_warn: true
        dm_on_kick: false
        dm_on_ban: false
        message_on_warn: false,
        message_on_kick: false
        message_on_ban: false
        message_channel: null
        warn_message: "You have received a warning on {guildName}: {reason}"
        kick_message: "You have been kicked from {guildName}. Reason given: {reason}"
        ban_message: "You have been banned from {guildName}. Reason given: {reason}"
        alert_on_rejoin: false
        alert_channel: null
        can_note: false
        can_warn: false
        can_mute: false
        can_kick: false
        can_ban: false
        can_view: false
        can_addcase: false
        can_massban: false
        can_hidecase: false
        can_act_as_other: false
      overrides:
        - level: ">=50"
          config:
            can_note: true
            can_warn: true
            can_mute: true
            can_kick: true
            can_ban: true
            can_view: true
            can_addcase: true
        - level: ">=100"
          config:
            can_massban: true
            can_hidecase: true
            can_act_as_other: true
    </CodeBlock>

    <h2>Commands</h2>
    <h3>!note</h3>
    <p>
      Permission: <code>can_note</code>
    </p>
    <p>

    </p>
  </div>
</template>

<script>
  import CodeBlock from "../CodeBlock";

  export default {
    components: { CodeBlock },
  };
</script>
