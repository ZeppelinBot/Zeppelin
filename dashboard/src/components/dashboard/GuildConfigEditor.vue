<template>
  <div v-if="loading">
    Loading...
  </div>
  <div v-else>
    <div v-if="errors.length" class="bg-gray-800 py-2 px-3 rounded shadow-md mb-4">
      <div class="font-semibold">Errors:</div>
      <div v-for="error in errors">{{ error }}</div>
    </div>

    <div class="flex items-center flex-wrap">
      <h1 class="flex-full md:flex-auto">Config for {{ guild.name }}</h1>
      <button v-if="!saving" class="flex-none bg-green-800 px-5 py-2 rounded hover:bg-green-700" v-on:click="save">
        <span v-if="saved">Saved!</span>
        <span v-else>Save</span>
      </button>
      <div v-if="saving" class="flex-none bg-gray-700 px-5 py-2 rounded">
        Saving...
      </div>
    </div>

    <AceEditor class="rounded shadow-lg border border-gray-700 mt-4"
               v-model="editableConfig"
               @init="editorInit"
               lang="yaml"
               theme="tomorrow_night"
               :height="editorHeight"
               ref="aceEditor" />
  </div>
</template>

<script lang="ts">
  import {mapState} from "vuex";
  import {ApiError} from "../../api";
  import { GuildState } from "../../store/types";

  import AceEditor from "vue2-ace-editor";

  let editorKeybindListener;
  let windowResizeListener;

  export default {
    components: {
      AceEditor,
    },
    async mounted() {
      try {
        await this.$store.dispatch("guilds/loadGuild", this.$route.params.guildId);
      } catch (err) {
        if (err instanceof ApiError) {
          this.$router.push('/dashboard');
          return;
        }

        throw err;
      }

      if (this.guild == null) {
        this.$router.push('/dashboard');
        return;
      }

      await this.$store.dispatch("guilds/loadConfig", this.$route.params.guildId);
      this.editableConfig = this.config || "";
      this.loading = false;
    },
    beforeRouteLeave(to, from, next) {
      if (editorKeybindListener) {
        window.removeEventListener("keydown", editorKeybindListener);
        editorKeybindListener = null;
      }

      if (windowResizeListener) {
        window.removeEventListener("resize", windowResizeListener);
        windowResizeListener = null;
      }

      next();
    },
    data() {
      return {
        loading: true,
        saving: false,
        saved: false,
        editableConfig: null,
        errors: [],
        editorWidth: 900,
        editorHeight: 600,
        savedTimeout: null,
      };
    },
    computed: {
      ...mapState("guilds", {
        guild(guilds: GuildState) {
          return guilds.available.get(this.$route.params.guildId);
        },
        config(guilds: GuildState) {
          return guilds.configs[this.$route.params.guildId];
        },
      }),
    },
    methods: {
      editorInit() {
        require("brace/ext/language_tools");
        require('brace/ext/searchbox');
        require("brace/mode/yaml");
        require("brace/theme/tomorrow_night");

        this.$refs.aceEditor.editor.setOptions({
          useSoftTabs: true,
          tabSize: 2
        });

        // Add Ctrl+S/Cmd+S save shortcut
        const isMac = /mac/i.test(navigator.platform);
        const modKeyPressed = (ev: KeyboardEvent) => (isMac ? ev.metaKey : ev.ctrlKey);
        const nonModKeyPressed = (ev: KeyboardEvent) => (isMac ? ev.ctrlKey : ev.metaKey);
        const shortcutModifierPressed = (ev: KeyboardEvent) => modKeyPressed(ev) && !nonModKeyPressed(ev) && !ev.altKey;

        if (editorKeybindListener) {
          // Make sure we clean up any potentially leftover event listeners
          window.removeEventListener("keydown", editorKeybindListener);
        }

        editorKeybindListener = (ev: KeyboardEvent) => {
          if (shortcutModifierPressed(ev) && ev.key === "s") {
            ev.preventDefault();
            this.save();
            return;
          }

          if (shortcutModifierPressed(ev) && ev.key === "f") {
            ev.preventDefault();
            this.$refs.aceEditor.editor.execCommand("find");
            return;
          }
        };
        window.addEventListener("keydown", editorKeybindListener);

        // Auto-fit editor to window
        this.fitEditorToWindow();

        if (windowResizeListener) {
          window.removeEventListener("resize", windowResizeListener);
        }

        let debounceTimeout;
        windowResizeListener = (ev: UIEvent) => {
          if (debounceTimeout) {
            clearTimeout(debounceTimeout);
          }

          debounceTimeout = setTimeout(() => {
            this.fitEditorToWindow();
          }, 350);
        };
        window.addEventListener("resize", windowResizeListener);
      },
      fitEditorToWindow() {
        const mainContainer = document.querySelector('.dashboard');
        const mainContainerStyles = window.getComputedStyle(mainContainer);

        const editorElem = this.$refs.aceEditor.$el;
        const newWidth = editorElem.parentNode.clientWidth;
        const rect = editorElem.getBoundingClientRect();
        const newHeight = Math.round(window.innerHeight - rect.top - parseInt(mainContainerStyles.paddingLeft, 10));
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
        if (this.saving) return;

        this.saved = false;
        this.saving = true;
        this.errors = [];

        if (this.savedTimeout) {
          clearTimeout(this.savedTimeout);
        }

        const minWaitTime = new Promise(resolve => setTimeout(resolve, 300));

        try {
          await this.$store.dispatch("guilds/saveConfig", {
            guildId: this.$route.params.guildId,
            config: this.editableConfig,
          });
          await minWaitTime;

          this.saving = false;
          this.saved = true;
          this.savedTimeout = setTimeout(() => this.saved = false, 3000);
        } catch (e) {
          if (e instanceof ApiError && (e.status === 400 || e.status === 422)) {
            this.errors = e.body.errors || ['Error while saving config'];
            this.saving = false;
            return;
          }

          throw e;
        }
      },
    },
  };
</script>
