<template>
	<div v-if="loading">
		Loading...
	</div>
	<div v-else>
		<h1>Guilds</h1>
    <ul class="list-none flex flex-wrap -m-4 pt-4">
      <li v-for="guild in guilds" class="flex-none p-4 w-full md:w-1/2 lg:w-1/3 xl:w-1/4">
        <div class="flex items-center overflow-hidden whitespace-nowrap">
          <div class="flex-none w-12 h-12">
            <img v-if="guild.icon" class="rounded-full w-full h-full" :src="guild.icon" alt="" :title="'Icon for guild ' + guild.name">
            <div v-else class="bg-gray-700 rounded-full w-full h-full"></div>
          </div>
          <div class="flex-auto pl-4">
            <div>
              <div class="font-semibold leading-tight">{{ guild.name }}</div>
              <div class="text-gray-600 text-sm leading-tight">{{ guild.id }}</div>
            </div>
            <div class="pt-1">
              <span class="inline-block bg-gray-700 rounded px-1 opacity-50 select-none cursor-not-allowed">Info</span>
              <router-link class="inline-block bg-gray-700 rounded px-1 hover:bg-gray-800 transition duration-100" :to="'/dashboard/guilds/' + guild.id + '/config'">Config</router-link>
              <span class="inline-block bg-gray-700 rounded px-1 opacity-50 select-none cursor-not-allowed">Access</span>
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
          const guilds = Array.from(state.available.values());
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
