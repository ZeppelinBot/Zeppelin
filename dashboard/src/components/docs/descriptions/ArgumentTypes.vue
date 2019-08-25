<template>
  <div>
    <h1>Argument Types</h1>
This page details the different argument types available for commands.
    <h2 id="delay">Delay</h2>A delay is used to specify an amount of time. It uses simple letters to specify time durations:
    <br />
    <br />Example:
    <code>2d15h27m3s</code> Would be 2 days, 15 hours, 27 minutes and 3 seconds.
    <br />
    <br />It is important to note that spaces are not supported!
    <br />
    <br />
    <b-collapse :open="false" class="card">
      <div slot="trigger" slot-scope="props" class="card-header" role="button">
        <p class="card-header-title">Additional Information</p>
        <a class="card-header-icon">
          <b-icon :icon="props.open ? 'menu-down' : 'menu-up'"></b-icon>
        </a>
      </div>
      <div class="card-content">
        <div class="content">
          Durations:
          <ul>
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
        </div>
      </div>
    </b-collapse>
    <h2 id="string">String</h2>

    <h2 id="user">User</h2>
    <p>
      Anything that uniquelly identifies a user. This includes:
    </p>
    <ul>
      <li>User ID <code>108552944961454080</code></li>
      <li>User Mention <code>@Dark#1010</code></li>
      <li>Loose user mention <code>Dark#1010</code></li>
    </ul>
  </div>
</template>

<script>
import CodeBlock from "../CodeBlock";

export default {
  components: { CodeBlock },
};
</script>
