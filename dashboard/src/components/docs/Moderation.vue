<template>
  <div>
    <header>
      <h1>Moderation</h1>
      <p>
        Moderation in Zeppelin is multi-layered. On top of typical actions such
        as warning, muting, kicking, and banning, Zeppelin allows moderators to
        utilise flags; create alerts; set thresholds; and act as others.
      </p>
      <p>
        This guide explains the options available in the
        <router-link to="/docs/plugins/modactions"> Mod actions</router-link>
        plugin. To best use this guide, read the default configuration of the
        Mod actions plugin alongside this. This plugin does
        <strong>not</strong> cover muting members, please see the
        <router-link to="/docs/plugins/mutes">Mutes</router-link>
        plugin for that.
      </p>
      <p>
        Please ensure you understand how
        <router-link to="/docs/plugins/plugin-configuration">plugin
          configuration</router-link> and
        <router-link to="/docs/configuration/permissions">plugin
          permissions</router-link> work before reading this guide since
        the configs defined here rely on these concepts.
      </p>
    </header>

    <h2>Moderation Commands</h2>
    <p>
      So that your moderators may use Zeppelin moderation, you must define the
      moderator role id in the config, assign it a level (50), and enable the
      Mod actions plugin.
      <CodeBlock code-lang="yaml" trim="start">
        levels:
          "PRETEND-ROLE-ID": 50 # Mod

        plugins:
          mod_actions: {}
      </CodeBlock>
    </p>
    <p>
      Each moderation command has a permission attached to it, so if your
      server has a hierarchical structure then you will be able to scope
      these permissions by referencing the plugins permissions page.
    </p>

    <h2>Sanction Notifications</h2>
    <p>These config options define how Zeppelin will interact with the
      members it sanctions (warns, kicks, bans).</p>

    <h3>DM Values</h3>
    <p>
      The values <code>dm_on_warn</code>, <code>dm_on_kick</code>, and
      <code>dm_on_ban</code> determine whether a member will be notified of
      their sanctions through DMs. Ignoring privacy settings, setting these to
      <code>true</code> will notify the member. Temporary banning uses the
      ban configuration.
    </p>

    <h3>Channel Values</h3>
    <p>
      An alternative way to notify members about sanctions is through
      mentioning them in a message sent in a channel. To enable this feature,
      set <code>message_on_warn</code>, <code>message_on_kick</code>, and
      and <code>message_on_ban</code> to true, then assign a
      <code>message_channel</code>.
    </p>

    <h3>Notifying messages</h3>
    <p>
      This is how you control the exact wording the member receives. You can
      adjust the wording per sanction type. These variables are
      <code>warn_message</code>, <code>kick_message</code>, and
      <code>ban_message</code>. Please remember that YAML supports mutli-line
      strings, this is how you can write newlines in your messages. Notably,
      temporarily banning a member permits the inclusion of the
      <code>banTime</code> variable through <code>tempban_message</code>.
    </p>

    <h3>Summary Example</h3>
    <p>
      Employing what we have learnt so far, we can write a configuration that:
    </p>

    <ul>
      <li>Alerts members of their warns in a channel, instead of DMs.</li>
      <li>Alerts members of kicks and bans in their DMs.</li>
      <li>Makes use of multi-line strings to prepare a tidy message.</li>
      <li>Includes the remaining ban time if a ban was temporary.</li>
    </ul>
    <CodeBlock code-lang="yaml" trim="start">
      plugins:
        mod_actions:
          config:
            dm_on_warn: false
            message_on_warn: true
            message_channel: "PRETEND-CHANNEL-ID"

            dm_on_kick: true

            dm_on_ban: true
            tempban_message: |-
              Dear {user.username},

              As a result of {reason}, you have been banned from {guildName}
              for {banTime}. We welcome you back provided you do not do this
              again.
    </CodeBlock>

    <h2>Alerts</h2>
    <p>
      Alerts are a nifty way for moderators to be notified of members trying to
      evade sanctions by promptly leaving and rejoining your server. To enable
      this feature, assign a channel in <code>alert_channel</code> and enable
      <code>alert_on_rejoin</code>.
    </p>
    <CodeBlock code-lang="yaml" trim="start">
      plugins:
        mod_actions:
          config:
            alert_on_rejoin: true
            alert_channel: "PRETEND-CHANNEL-ID"
    </CodeBlock>

    <h2>Thresholds</h2>
    <p>
      Thresholds alert moderators if a member is about to exceed a
      predetermined number of cases, prompting moderators to consider whether
      alternative (harsher) action could be taken. To enable thresholds,
      assign the threshold as <code>warn_notify_threshold</code>, adjust the
      message under <code>warn_notify_message</code>, and enable
      <code>warn_notify_enabled</code>.
    </p>
    <p>
      Write your config cleverly, check the default values for
      <code>warn_notify_threshold</code> and <code>warn_notify_message</code>,
      if these are acceptable then all you need to do is enable
      <code>warn_notify_enabled</code>.
    </p>

    <h2>Ban Message Deletion</h2>
    <p>
      When a member is banned, Zeppelin automatically deletes the last day of
      message history. You can extend this through the
      <code>ban_delete_message_days</code> option.
    </p>
  </div>
</template>

<script lang="ts">
  import CodeBlock from "./CodeBlock.vue";

  export default {
    components: { CodeBlock },
  };
</script>
