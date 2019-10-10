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
            <img v-if="guild.icon" class="rounded-full w-12" :src="guild.icon" :alt="'Logo for guild ' + guild.name">
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
        guilds: state => {
          const guilds = Array.from(state.available || []);
          guilds.sort((a, b) => {
            if (a.name > b.name) return 1;
            if (a.name < b.name) return -1;
            if (a.id > b.id) return 1;
            if (a.id < b.id) return -1;
            return 0;
          });
          return guilds;
        },
      }),
    },
  };
</script>
