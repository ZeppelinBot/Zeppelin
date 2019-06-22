<template>
	<div v-if="loading">
		Loading...
	</div>
	<div v-else>
		<h1>Guilds</h1>
		<table v-for="guild in guilds">
			<tr>
				<td>{{ guild.id }}</td>
				<td>{{ guild.name }}</td>
				<td>
					<a v-bind:href="'/dashboard/guilds/' + guild.id + '/config'">Config</a>
				</td>
			</tr>
		</table>
	</div>
</template>

<script>
	import {mapGetters, mapState} from "vuex";
    import {LoadStatus} from "../store/types";

	export default {
	  mounted() {
	    this.$store.dispatch("guilds/loadAvailableGuilds");
	  },
	  computed: {
	    loading() {
	      return this.$state.guilds.availableGuildsLoadStatus !== LoadStatus.Done;
	    },
	    ...mapState({
	      guilds: 'guilds/available',
	    }),
	  },
	};
</script>
