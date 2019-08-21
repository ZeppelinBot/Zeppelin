<template>
  <div v-if="loading">
    Loading...
  </div>
  <div v-else>
    <h1 class="z-title is-1 mb-1">{{ data.info.prettyName || data.name }}</h1>
    <p class="mb-1">
      Name in config: <code>{{ data.name }}</code>
    </p>

    <div v-if="data.info.description">
      <h2 class="z-title is-2 mt-2 mb-1">Description</h2>
      <div class="content" v-html="renderMarkdown(data.info.description)"></div>
    </div>

    <h2 class="z-title is-2 mt-2 mb-1">Default configuration</h2>
    <CodeBlock lang="yaml">{{ renderConfiguration(data.options) }}</CodeBlock>

    <div v-if="data.commands.length">
      <h2 class="z-title is-2 mt-2 mb-1">Commands</h2>
      <div v-for="command in data.commands">
        <h3 class="z-title is-3 mt-2 mb-1">!{{ command.trigger }}</h3>
        <div v-if="command.config.requiredPermission">
          Permission: <code>{{ command.config.requiredPermission }}</code>
        </div>
        <div v-if="command.config.info && command.config.info.basicUsage">
          Basic usage: <code>{{ command.config.info.basicUsage }}</code>
        </div>
        <div v-if="command.config.aliases && command.config.aliases.length">
          Shortcut:
          <code style="margin-right: 4px" v-for="alias in command.config.aliases">!{{ alias }}</code>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import Vue from "vue";
  import {mapState} from "vuex";
  import marked from "marked";
  import yaml from "js-yaml";
  import CodeBlock from "./CodeBlock";

  export default {
    components: { CodeBlock },

    async mounted() {
      this.loading = true;
      await this.$store.dispatch("docs/loadPluginData", this.pluginName);
      this.loading = false;
    },
    methods: {
      renderMarkdown(str) {
        return marked(str);
      },
      renderConfiguration(options) {
        return yaml.safeDump({
          [this.pluginName]: options,
        });
      },
    },
    data() {
      return {
        loading: true,
        pluginName: this.$route.params.pluginName,
      };
    },
    computed: {
      ...mapState("docs", {
        data(state) {
          return state.plugins[this.pluginName];
        },
      }),
    },
  }
</script>
