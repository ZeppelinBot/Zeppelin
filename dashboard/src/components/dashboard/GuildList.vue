<template>
	<div v-if="loading">
		Loading...
	</div>
	<div v-else>
		<h1>Guilds</h1>
    <ul class="list-none flex flex-wrap -m-4 pt-4">
      <li v-for="guild in guilds" class="flex-none p-4 w-full md:w-1/2 lg:w-1/3 xl:w-1/4">
        <div class="flex items-center">
          <div class="flex-none w-12 h-12">
            <img v-if="guild.icon" class="rounded-full w-full h-full" :src="guild.icon" alt="" :title="'Logo for guild ' + guild.name">
            <div v-else class="bg-gray-700 rounded-full w-full h-full"></div>
          </div>
          <div class="flex-auto ml-4">
            <div>
              <div class="font-semibold leading-tight">{{ guild.name }}</div>
              <div class="text-gray-600 text-sm leading-tight">{{ guild.id }}</div>
            </div>
            <div class="pt-1">
              <router-link class="inline-block bg-gray-700 rounded px-1 hover:bg-gray-800" :to="'/dashboard/guilds/' + guild.id + '/config'">Config</router-link>
              <router-link v-if="canManageAccess(guild.id)" class="inline-block bg-gray-700 rounded px-1 hover:bg-gray-800" :to="'/dashboard/guilds/' + guild.id + '/access'">Access</router-link>
              <router-link v-if="canManageAccess(guild.id)" class="inline-block bg-gray-700 rounded px-1 hover:bg-gray-800" :to="'/dashboard/guilds/' + guild.id + '/import-export'">Import/export</router-link>
            </div>
          </div>
        </div>
      </li>
    </ul>
	</div>
</template>

<script lang="ts">
  import { mapState } from "vuex";
  import { ApiPermissions, hasPermission } from "@shared/apiPermissions";
  import { AuthState, GuildState } from "../../store/types";

  export default {
    async mounted() {
      await this.$store.dispatch("guilds/loadAvailableGuilds");
      await this.$store.dispatch("guilds/loadMyPermissionAssignments");
      this.loading = false;
    },
    data() {
      return { loading: true };
    },
    computed: {
      ...mapState('guilds', {
        guilds: (state: GuildState) => {
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

        guildPermissionAssignments: (state: GuildState) => state.guildPermissionAssignments,
      }),

      ...mapState('auth', {
        userId: (state: AuthState) => state.userId!,
      }),
    },
    methods: {
      canManageAccess(guildId: string) {
        const guildPermissions = this.guildPermissionAssignments[guildId] || [];
        const myPermissions = guildPermissions.find(p => p.type === "USER" && p.target_id === this.userId) || null;
        return myPermissions && hasPermission(new Set(myPermissions.permissions), ApiPermissions.ManageAccess);
      },
    },
  };
</script>
