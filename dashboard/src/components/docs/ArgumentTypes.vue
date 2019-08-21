<template>
  <div>
    <h1 class="z-title is-1 mb-1">Argument Types</h1>
    <p class="mb-1">
      This page details the different argument types available for commands.
    </p>
    <h2 id="delay" class="z-title is-2 mt-2 mb-1">Delay</h2>
    <p class="mb-1">
      A delay is used to specify an amount of time. It uses simple letters to specify time durations.<br>
      For example, <code>2d15h27m3s</code> would be 2 days, 15 hours, 27 minutes and 3 seconds.
    </p>
    <p class="mb-1">
      Note that the delay should always be written as 1 word, without spaces!
    </p>

    <b-collapse :open="false" class="card mb-1">
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

    <h2 id="string" class="z-title is-2 mb-1">String</h2>

    <h2 id="user" class="z-title is-2 mt-2 mb-1">User</h2>
    <p class="mb-1">
      Anything that uniquely identifies a user. This includes:
    </p>
    <ul class="z-list z-ul mb-1">
      <li>User ID <code>108552944961454080</code></li>
      <li>User Mention <code>@Dark#1010</code></li>
      <li>Loose user mention <code>Dark#1010</code></li>
    </ul>
  </div>
</template>

<script>
import CodeBlock from "./CodeBlock";

export default {
  components: { CodeBlock },
};
</script>
