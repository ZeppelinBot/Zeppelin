<template>
  <div>
    <h1>Locate user</h1>
    <p>
      Name in config: <code>locate_user</code>
    </p>

    <h2>Description</h2>
    <p>
      This plugin allows users with access to the commands the following:
    </p>
    <ul>
      <li>Instantly receive an invite to the voice channel of a user</li>
      <li>Be notified as soon as a user switches or joins a voice channel</li>
    </ul>

    <h2>Default configuration</h2>
    <CodeBlock lang="yaml" trim="4">
      config:
        can_where: false
        can_alert: false
      overrides:
        - level: ">=50"
          config:
            can_where: true
            can_alert: true
    </CodeBlock>

    <h2>Commands</h2>
    <h3>!where</h3>
    <p>
      Permission: <code>can_where</code><br>
      Arguments:
    </p>
    <ul>
      <li><code>&lt;User&gt;</code> The user we want to find</li>
    </ul>
    <p>
      Sends an instant invite to the voice channel the user from the <code>&lt;User&gt;</code> argument is in.
    </p>
    <h3>!vcalert</h3>
    <p>
      Permission: <code>can_alert</code><br>

      Basic usage: <code>!vcalert 108552944961454080</code><br>

      
      Shortcut: <code>!vca</code><br><br>

      Sends an instant invite along with a specified reminder once the user switches or joins a voice channel.
    </p>
    <b-collapse :open="false" class="card">
      <div
        slot="trigger"
        slot-scope="props"
        class="card-header"
        role="button">
        <div class="card-header-title">
          Additional Information
        </div>
        <a class="card-header-icon">
          <b-icon
            :icon="props.open ? 'menu-down' : 'menu-up'">
          </b-icon>
        </a>
      </div>
      <div class="card-content">
        <div class="content">

          Signatures:
          <ul>
            <li><code>!vcalert &lt;user&gt;</code></li>
            <li><code>!vcalert &lt;user&gt; [delay] [reminderString]</code></li>
          </ul>

          Arguments:
          <ul>
            <li><code>&lt;user&gt;</code> The user we want to find</li>
            <li><code>[delay]</code> How long the alert should be active, following the default <router-link to="/docs/descriptions/argument-types#Delay">Delay format</router-link>. Default: <code>10 minutes</code></li>
            <li><code>[reminderString]</code> Any text we want to receive once the alert triggers. Default: <code>None</code></li>
          </ul>
        </div>
      </div>
    </b-collapse>
  </div>
</template>

<script>
  import CodeBlock from "../CodeBlock";

  export default {
    components: { CodeBlock },
  };
</script>
