<template>
  <div>
    <h1 class="z-title is-1 mb-1">Introduction</h1>
    <p class="mb-1">
      Zeppelin is a private moderation bot for Discord, designed with large servers and reliability in mind.
    </p>

    <h2 class="z-title is-2 mt-2 mb-1">Getting the bot</h2>
    <p class="mb-1">
      Since the bot is currently private, access to the bot is granted on a case by case basis.<br>
      There are plans to streamline this process in the future.
    </p>

    <h2 class="z-title is-2 mt-2 mb-1">Configuration</h2>
    <p class="mb-1">
      All Zeppelin configuration is done through the dashboard by editing a YAML config file. By default, only the server
      owner has access to this, but they can give other users access as they see fit. See <router-link to="/docs/configuration-format">Configuration format</router-link> for more details.
    </p>

    <h2 class="z-title is-2 mt-2 mb-1">Plugins</h2>
    <p class="mb-1">
      Zeppelin is divided into plugins: grouped functionality that can be enabled/disabled as needed, and that have their own configurations.
    </p>

    <h2 class="z-title is-2 mt-2 mb-1">Commands</h2>
    <p class="mb-1">
      The commands for each plugin are listed on the plugin's page (see "Plugins" on the menu). On these pages, the command prefix is assumed to be <code>!</code> but this can be changed on a per-server basis.
    </p>
  </div>
</template>
