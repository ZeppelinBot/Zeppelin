<template>
	<div v-if="loading">
		Loading...
	</div>
	<div v-else>
		<h1>Guilds</h1>
		<table v-for="guild in guilds">
			<tr>
				<td>{{ guild.guild_id }}</td>
				<td>{{ guild.name }}</td>
				<td>
					<a v-bind:href="'/dashboard/guilds/' + guild.guild_id + '/config'">Config</a>
				</td>
			</tr>
		</table>
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
	      guilds: 'available',
	    }),
	  },
	};
</script>
