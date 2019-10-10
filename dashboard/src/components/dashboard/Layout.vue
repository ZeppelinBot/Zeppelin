<template>
	<div class="dashboard container mx-auto px-4 py-2">
    <nav class="flex items-stretch pl-4 pr-2 py-1 border border-gray-700 rounded bg-gray-800 shadow-xl mb-8">
      <div class="flex-initial flex items-center">
        <img class="flex-auto w-10 mr-5" src="../../img/logo.png" alt="" aria-hidden="true">

        <router-link to="/dashboard">
          <h1 class="flex-auto font-semibold">Zeppelin Dashboard</h1>
        </router-link>

        <ul class="dashboard-nav list-none flex ml-8">
          <router-link class="flex-auto mr-4" to="/dashboard">Guilds</router-link>
          <a href="javascript:void(0)" class="navbar-item hover:text-red-400" v-on:click="logout()">Log out</a>
        </ul>
      </div>

      <div class="flex-1 flex items-center justify-end">
        <router-link
          to="/docs"
          role="menuitem"
          class="py-1 px-2 rounded hover:bg-gray-700">
          Go to documentation
        </router-link>
      </div>
    </nav>

    <div class="main-content">
      <router-view></router-view>
    </div>
	</div>
</template>

<style scoped>
  .dashboard-nav a {
    &:hover {
      @apply underline;
    }
  }

  .dashboard-nav .router-link-exact-active {
    @apply underline;
  }
</style>

<script>
  // import "../../style/dashboard.scss";

  export default {
    methods: {
      async logout() {
        await this.$store.dispatch("auth/logout");
        window.location.pathname = '/';
      }
    },
  };
</script>
