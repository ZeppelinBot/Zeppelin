<template>
  <div v-if="loading">
    Loading...
  </div>
  <div v-else>
    <h2 class="title is-1">Config for {{ guild.name }}</h2>
    <codemirror v-model="editableConfig" :options="cmConfig"></codemirror>
    <div class="editor-footer">
      <div class="actions">
        <button class="button" v-on:click="save" :disabled="saving">Save</button>
      </div>
      <div class="status">
        <div class="status-message" v-if="saving">Saving...</div>
        <div class="status-message error" v-if="errors.length">
          <div v-for="error in errors">{{ error }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .vue-codemirror {
    margin-bottom: 16px;
  }

  >>> .CodeMirror {
    height: 70vh;
  }
</style>

<script>
  import {mapState} from "vuex";
  import { codemirror } from "vue-codemirror";
  import "codemirror/lib/codemirror.css";
  import "codemirror/theme/oceanic-next.css";
  import "codemirror/mode/yaml/yaml.js";
  import {ApiError} from "../api";

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
        editableConfig: null,
        errors: [],
        cmConfig: {
          indentWithTabs: false,
          indentUnit: 2,
          smartIndent: false,
          lineNumbers: true,
          mode: "text/x-yaml",
          theme: "oceanic-next",
          extraKeys: {
            Tab: cm => cm.execCommand("indentMore"),
            "Shift-Tab": cm => cm.execCommand("indentLess"),
          },
        },
      };
    },
    computed: {
      ...mapState('guilds', {
        guild() {
          return this.$store.state.guilds.available.find(g => g.id === this.$route.params.guildId);
        },
        config() {
          return this.$store.state.guilds.configs[this.$route.params.guildId];
        },
      }),
    },
    methods: {
      async save() {
        this.saving = true;
        this.errors = [];

        try {
          await this.$store.dispatch("guilds/saveConfig", {
            guildId: this.$route.params.guildId,
            config: this.editableConfig,
          });
        } catch (e) {
          if (e instanceof ApiError && (e.status === 400 || e.status === 422)) {
            this.errors = e.body.errors || ['Error while saving config'];
            this.saving = false;
            return;
          }

          throw e;
        }

        this.$router.push("/dashboard");
      },
    },
  };
</script>
