<template>
  <div v-if="loading">
    Loading...
  </div>
  <div v-else>
    <h2 class="title is-1">Config for {{ guild.name }}</h2>
    <AceEditor v-model="editableConfig" @init="editorInit" lang="yaml" theme="twilight" :width="editorWidth" :height="editorHeight" ref="aceEditor"></AceEditor>

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

<script>
  import {mapState} from "vuex";
  import {ApiError} from "../../api";

  import AceEditor from "vue2-ace-editor";

  export default {
    components: {
      AceEditor,
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
        editorWidth: 900,
        editorHeight: 600
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
      editorInit() {
        require("brace/ext/language_tools");
        require("brace/mode/yaml");
        require("brace/theme/twilight");

        this.$refs.aceEditor.editor.setOptions({
          useSoftTabs: true,
          tabSize: 2
        });

        this.fitEditorToWindow();
      },
      fitEditorToWindow() {
        const editorElem = this.$refs.aceEditor.$el;
        const newWidth = editorElem.parentNode.clientWidth;
        const rect = editorElem.getBoundingClientRect();
        const newHeight = window.innerHeight - rect.top - 100;
        this.resizeEditor(newWidth, newHeight);
      },
      resizeEditor(newWidth, newHeight) {
        this.editorWidth = newWidth;
        this.editorHeight = newHeight;

        this.$nextTick(() => {
          this.$refs.aceEditor.editor.resize();
        });
      },
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
