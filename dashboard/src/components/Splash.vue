<template>
  <div class="splash">
    <div class="wrapper">
      <div class="logo-column">
        <img class="logo" src="../img/logo.png" alt="Zeppelin Logo">
      </div>
      <div class="info-column">
        <h1>Zeppelin</h1>
        <div class="description">
          Zeppelin is a private moderation bot for Discord, designed with large servers and reliability in mind.
        </div>
        <div class="actions">
          <router-link class="btn" to="/login">Dashboard</router-link>
          <router-link class="btn" to="/docs">Docs</router-link>
        </div>
        <div class="error" v-if="error">
          <strong>Error</strong>
          <div v-if="error === 'noaccess'">No access</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import "../style/splash.scss";

  export default {
    computed: {
      error() {
        return this.$route.query.error;
      },
    },
  }
</script>
