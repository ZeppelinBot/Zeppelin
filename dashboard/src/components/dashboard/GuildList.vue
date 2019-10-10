<template>
	<div v-if="loading">
		Loading...
	</div>
	<div v-else>
		<h1>Guilds</h1>
    <ul class="list-none flex flex-wrap -m-4 pt-4">
      <li v-for="guild in guilds" class="flex-none m-4 w-full md:w-1/2 lg:w-1/3 xl:w-1/4">
        <div class="flex items-center">
          <div class="flex-none">
            <img v-if="guild.icon" class="guild-logo" :src="guild.icon" :alt="'Logo for guild ' + guild.name">
          </div>
          <div class="flex-auto ml-3">
            <div>
              <span class="font-semibold">{{ guild.name }}</span>
              <span class="text-gray-600 text-sm">({{ guild.id }})</span>
            </div>
            <div class="pt-1">
              <span class="inline-block bg-gray-700 rounded px-1 opacity-50 select-none">Info</span>
              <router-link class="inline-block bg-gray-700 rounded px-1 hover:bg-gray-800" :to="'/dashboard/guilds/' + guild.id + '/config'">Config</router-link>
              <span class="inline-block bg-gray-700 rounded px-1 opacity-50 select-none">Access</span>
            </div>
          </div>
        </div>
      </li>
    </ul>
	</div>
</template>

<style scoped>
  .table td {
    vertical-align: middle;
  }

  .guild-logo {
    display: block;
    width: 42px;
    border-radius: 50%;
  }

  .guild-name {
    font-weight: 600;
  }

  .guild-id {
    color: hsla(220, 100%, 95%, 0.6);
  }
</style>

<script>
  import {mapState} from "vuex";

  export default {
    async mounted() {
      await this.$store.dispatch("guilds/loadAvailableGuilds");
      this.loading = false;
    },
    data() {
      return { loading: true };
    },
    computed: {
      ...mapState('guilds', {
        guilds: 'available',
      }),
    },
  };
</script>
