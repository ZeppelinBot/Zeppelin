<template>
  <div>
    <h1>Moderation</h1>
    <p>
      Moderation in Zeppelin is multi-layered, with 'typical' actions such as warning, muting, kicking, banning,
      etc. Featuring flags, moderation advances to allow for alerts, thresholds, acting as others, and the creation of
      cases for context (right-click) actions.
    </p>
    <p>
      This guide will be expanded in the future. For now it covers how to setup the
      <router-link to="/docs/plugins/modactions"> Mod Actions plugin</router-link>.
    </p>

    <h2>Sanction Notifications</h2>
    <p>These first config options define how Zeppelin will interact with the users sanctioned.</p>

    <h3>DM Values</h3>
    <p>
      The values `dm_on_warn`, `dm_on_kick`, and `dm_on_ban` determine whether a user will be notified of their sanctions
      through DMs. Ignoring privacy settings, setting these to `true` will notify the user, and `false` keeps them in the
      dark. Note: `tempban` actions take the `ban` configuration.
    </p>

    <h3>Channel Values</h3>
    <p>
      The other set of notifying options `message_on_warn`, `message_on_kick`, and `message_on_ban` are similar to their
      `DM` counterparts, but, taking the value of `message_channel` they notify a channel instead. Note: `tempban` actions
      take the `ban` configuration.
    </p>

    <h4>Notifying messages</h4>
    <p>
      Both of these notifying options take the same message templates defined in `warn_message`, `kick_message`, and
      `ban_message`. In the official documentation, you will see these written as one line, you can make the messages
      multi-line like so:
        <CodeBlock code-lang="yaml">
          plugins:
            mod_actions:
              config:
                warn_message: |-
                  I am a
                  multi-line message!
        </CodeBlock>

      However, the `tempban` action has its own message option that can be defined under `tempban_message`, it comes
      with an exciting new variable: `banTime`.
    </p>

    <h2>Alerts</h2>
    <p>
      Alerts are a nifty way for your mod-team to be notified of actors trying to evade sanctions by leaving and
      re-joining your server. Define the channel in `alert_channel` and set `alert_on_rejoin` to `true`.
    </p>

    <h2>Thresholds</h2>
    <p>
      Thresholds are useful for alerting moderators if a user is about to exceed a pre-determined number of cases.
      This can be used to make your mod team consider whether harsher action is necessary. Define the threshold in
      `warn_notify_threshold`, adjust the message under `warn_notify_message`, and enable `warn_notify_enabled`.
    </p>

    <h2>Ban Message Deletion</h2>
    <p>
      You can adjust the day's worth of messages Zeppelin deletes under the `ban_delete_message_days` option. Do not
      append your input with 'd'.
    </p>

    <h2>Moderation Commands</h2>
    <p>
      Before reading this, you should read the
      <router-link to="/docs/configuration/permissions">Permission's page</router-link> before continuing to set up this
      plugin.

      Zeppelin has 5 core commands, `note`, `warn`, `mute`, `kick`, and `ban`; with `unban`, `view`, and `addcase`
      making 8. By default, these are disabled for users levelled 0, and enabled for users level 50 and above.

      This guide does not go into detail about how to use them at the moment, you can read a different guide for that
      <a href="https://docs.google.com/presentation/d/e/2PACX-1vQTFZW4NiJicngfAv36tLlWG5XjktVyZhljekOkzUyzsktwcNCH_Zm82Dm3r1c7S7vKOArJ6XIO5azC/pub?start=true&loop=false&delayms=60000&slide=id.gc6f9e470d_0_0"> here.</a>

      The
      <a href="https://zeppelin.gg/docs/plugins/mod_actions/configuration"> default configuration</a>
      outlines what permissions are available for those level 50 & level 100, this guide will explain how to adjust
      those permissions with overrides.

      In the example below, users levelled 50 and above are now able to hide cases.

      <Expandable class="wide">
        <template v-slot:title>Click to view example</template>
        <template v-slot:content>
          <CodeBlock code-lang="yaml">
            levels:
              "807693394393956422": 50 #Mod

            plugins:
              mod_actions:
                overrides:
                  - level: ">=50"
                    config:
                      can_hidecase: true
          </CodeBlock>
        </template>
      </Expandable>
    </p>
  </div>
</template>

<script lang="ts">
import CodeBlock from "./CodeBlock.vue";
import Expandable from "../Expandable.vue";

export default {
  components: {Expandable, CodeBlock },
};
</script>
