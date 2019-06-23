<template>
	<div v-if="loading">
		Loading...
	</div>
	<div v-else>
		<h1>Config for {{ guild.name }}</h1>
		<codemirror v-model="editableConfig" :options="cmConfig"></codemirror>
		<button v-on:click="save" :disabled="saving">Save</button>
		<span v-if="saving">Saving...</span>
		<span v-else-if="saved">Saved!</span>
	</div>
</template>

<script>
	import {mapState} from "vuex";
	import { codemirror } from "vue-codemirror";
	import "codemirror/lib/codemirror.css";
	import "codemirror/theme/oceanic-next.css";
	import "codemirror/mode/yaml/yaml.js";

	export default {
	  components: {
	    codemirror,
	  },
	  async mounted() {
        await this.$store.dispatch("guilds/loadAvailableGuilds");
        if (this.guild == null) {
          this.$router.push('/dashboard/guilds');
          return;
        }

	    await this.$store.dispatch("guilds/loadConfig", this.$route.params.guildId);
	    this.editableConfig = this.config || "";
	    this.loading = false;
	  },
	  data() {
	    return {
	      loading: true,
	      saving: false,
	      saved: false,
	      editableConfig: null,
	      cmConfig: {
	        indentWithTabs: false,
	        indentUnit: 2,
	        lineNumbers: true,
	        mode: "text/x-yaml",
	        theme: "oceanic-next",
	      },
	    };
	  },
	  computed: {
	    ...mapState('guilds', {
	      guild() {
	        return this.$store.state.guilds.available.find(g => g.guild_id === this.$route.params.guildId);
	      },
	      config() {
	        return this.$store.state.guilds.configs[this.$route.params.guildId];
	      },
	    }),
	  },
	  methods: {
	    async save() {
	      this.saving = true;
	      await this.$store.dispatch("guilds/saveConfig", {
	        guildId: this.$route.params.guildId,
	        config: this.editableConfig,
	      });
	      this.saving = false;
	      this.saved = true;
	      setTimeout(() => this.saved = false, 2500);
	    },
	  },
	};
</script>
