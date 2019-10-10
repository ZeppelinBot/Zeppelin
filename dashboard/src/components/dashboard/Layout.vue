<template>
	<div class="dashboard dashboard-cloak">
    <nav class="navbar" role="navigation" aria-label="main navigation">
      <div class="container">
        <div class="navbar-brand">
          <div class="navbar-item">
            <img class="dashboard-logo" src="../../img/logo.png" alt="" aria-hidden="true">
            <h1 class="dashboard-title">Zeppelin Dashboard</h1>
          </div>
        </div>

        <div class="navbar-menu is-active">
          <div class="navbar-start">
            <router-link to="/dashboard" class="navbar-item">Guilds</router-link>
            <a href="/docs" class="navbar-item">Documentation</a>
          </div>
          <div class="navbar-end">
            <a href="javascript:void(0)" class="navbar-item" v-on:click="logout()">Log out</a>
          </div>
        </div>
      </div>
    </nav>

    <div class="section">
      <div class="container">
        <router-view></router-view>
      </div>
    </div>
	</div>
</template>

<style scoped>
  .dashboard-cloak {
    /* Replaced by "visible" in dashboard.scss */
    visibility: hidden;
  }

  .dashboard-logo {
    margin-right: 12px;
  }

  .dashboard-title {
    font-weight: 600;
  }
</style>

<script>
  // import "../../style/dashboard.scss";

  export default {
    methods: {
      async logout() {
        await this.$store.dispatch("auth/logout");
        this.$router.push('/');
      }
    },
  };
</script>
