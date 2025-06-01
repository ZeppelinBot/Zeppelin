<template>
  <div class="splash">
    <div class="error" v-if="error">
      <div class="message">{{ error }}</div>
    </div>
    <div class="wrapper">
      <div class="logo-column">
        <img class="logo" src="/img/logo.png" alt="Zeppelin Logo" />
      </div>
      <div class="info-column">
        <h1>Zeppelin</h1>
        <div class="description">
          Zeppelin is a private moderation bot for Discord, designed with large servers and reliability in mind.
        </div>
        <div class="actions">
          <a class="btn" href="/dashboard">Dashboard</a>
          <a class="btn" href="/docs">Documentation</a>
        </div>
        <ul class="links">
          <li>
            <a href="https://discord.gg/zeppelin">Official Discord Server</a>
          </li>
          <li>
            <a href="https://github.com/Dragory/ZeppelinBot">GitHub</a>
          </li>
          <li>
            <a href="/privacy-policy">Privacy Policy</a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const errorMessages = {
  noAccess: "No dashboard access. If you think this is a mistake, please contact your server owner.",
  expiredLogin: "Dashboard login expired. Please log in again.",
};

const route = useRoute();
const error = ref<string | null>(null);

watch(
  () => route.query.error,
  (value) => {
    error.value = errorMessages[String(value)] || null;
  },
);
</script>
