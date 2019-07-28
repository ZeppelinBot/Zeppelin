<template>
	<div v-if="loading">
		Loading...
	</div>
	<div v-else>
		<h2 class="title is-2">Guilds</h2>
		<table class="table">
			<tr v-for="guild in guilds">
        <td>
          <img v-if="guild.icon" class="guild-logo" :src="guild.icon" :aria-label="'Logo for guild ' + guild.name">
        </td>
        <td>
          <div class="guild-name">{{ guild.name }}</div>
          <div class="guild-id">{{ guild.id }}</div>
        </td>
				<td>
          <router-link class="button" :to="'/dashboard/guilds/' + guild.id + '/config'">Config</router-link>
				</td>
			</tr>
		</table>
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
