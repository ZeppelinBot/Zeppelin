<template>
  <div>
    <h1>Argument Types</h1>
    <p>
      This page details the different argument types available for commands.
    </p>

    <h2 id="string">string</h2>
    <p>
      Any text
    </p>

    <h2 id="number">number</h2>
    <p>
      Any number
    </p>

    <h2 id="user">user</h2>
    <p>
      Anything that uniquely identifies a user. This includes:
    </p>
    <ul>
      <li>User ID <code>108552944961454080</code></li>
      <li>User mention <code>@Dark#1010</code></li>
      <li>Loose user mention <code>Dark#1010</code></li>
    </ul>

    <h2 id="userId">userId</h2>
    <p>
      A valid user ID, e.g. <code>108552944961454080</code>
    </p>

    <h2 id="channel">channel</h2>
    <p>
      Anything that uniquely identifies a channel. This includes:
    </p>
    <ul>
      <li>Channel ID <code>473087035574321152</code></li>
      <li>Channel mention <code>#my-channel</code></li>
    </ul>

    <h2 id="channelId">channelId</h2>
    <p>
      A valid channel ID, e.g. <code>473087035574321152</code>
    </p>

    <h2 id="role">role</h2>
    <p>
      Anything that uniquely identifies a role. This includes:
    </p>
    <ul>
      <li>Role ID <code class="inline-code">473085927053590538</code></li>
      <li>Role mention <code>@MyRole</code></li>
    </ul>

    <h2 id="member">member</h2>
    <p>
      Anything that uniquely identifies a member currently on the server. This includes:
    </p>
    <ul>
      <li>User ID <code>108552944961454080</code></li>
      <li>User Mention <code>@Dark#1010</code></li>
      <li>Loose user mention <code>Dark#1010</code></li>
    </ul>

    <h2 id="resolvedMember">resolvedMember</h2>
    <p>
      See <code>member</code> above
    </p>

    <h2 id="delay">delay</h2>
    <p>
      A delay is used to specify an amount of time. It uses simple letters to specify time durations.<br>
      For example, <code>2d15h27m3s</code> would be 2 days, 15 hours, 27 minutes and 3 seconds.
    </p>
    <p>
      Note that the delay should always be written as 1 word, without spaces!
    </p>

    <Expandable>
      <template v-slot:title>Additional information</template>
      <template v-slot:content>
        Durations:
        <ul>
          <li>
            <code>w</code> Week
          </li>
          <li>
            <code>d</code> Day
          </li>
          <li>
            <code>h</code> Hour
          </li>
          <li>
            <code>m</code> Minute
          </li>
          <li>
            <code>s</code> Seconds
          </li>
        </ul>
      </template>
    </Expandable>
  </div>
</template>

<script>
  import CodeBlock from "./CodeBlock";
  import Expandable from "../Expandable";

  export default {
    components: {
      CodeBlock,
      Expandable,
    },
  };
</script>
