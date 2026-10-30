<template>
  <Head title="Documentation" />

  <DocsLayout>
    <ContentPaper>
      <h1>Introduction</h1>
      <p>Zeppelin is a private moderation bot for Discord, designed with large servers and reliability in mind.</p>
      <h2>Getting the bot</h2>
      <p>
        Access to the bot is granted on a case by case basis. For details, please see the #info channel on the
        <a href="https://discord.gg/zeppelin">Official Zeppelin Discord server</a>.
      </p>
      <h2>Configuration</h2>
      <p>
        All Zeppelin configuration is done through the dashboard by editing a YAML config file. By default, only the
        server owner has access to this, but they can give other users access as they see fit. See
        <Link href="/docs/configuration-format">Configuration format</Link> for more details.
      </p>
      <h2>Plugins</h2>
      <p>
        Zeppelin is divided into plugins: grouped functionality that can be enabled/disabled as needed, and that have
        their own configurations.
      </p>
      <h2>Commands</h2>
      <p>
        The commands for each plugin are listed on the plugin's page (see "Plugins" on the menu). On these pages, the
        command prefix is assumed to be ! but this can be changed on a per-server basis.
      </p>
    </ContentPaper>
  </DocsLayout>
</template>

<script setup lang="ts">
import ContentPaper from "#frontend/features/layout/ContentPaper.vue";
import DocsLayout from "#frontend/features/docs/layouts/DocsLayout.vue";
import { Head } from "@inertiajs/vue3";
import { Link } from "@adonisjs/inertia/vue";
</script>
