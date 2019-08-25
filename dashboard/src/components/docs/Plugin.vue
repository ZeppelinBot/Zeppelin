<template>
  <div v-if="loading">
    Loading...
  </div>
  <div v-else>
    <h1 class="z-title is-1 mb-1">{{ data.info.prettyName || data.name }}</h1>
    <p class="mb-1">
      Name in config: <code>{{ data.name }}</code>
    </p>

    <div v-if="data.info.description" class="content" v-html="renderMarkdown(data.info.description)"></div>

    <p class="mt-1 mb-1">
      To enable this plugin with default configuration, add <code>{{ data.name }}: {}</code> to the <code>plugins</code> list in config
    </p>

    <h2 id="default-configuration" class="z-title is-2 mt-2 mb-1">Default configuration</h2>
    <CodeBlock lang="yaml">{{ renderConfiguration(data.options) }}</CodeBlock>
    <b-collapse :open="false" class="card mt-1 mb-1">
      <div slot="trigger" slot-scope="props" class="card-header" role="button">
        <p class="card-header-title">Config schema</p>
        <a class="card-header-icon">
          <b-icon :icon="props.open ? 'menu-down' : 'menu-up'"></b-icon>
        </a>
      </div>
      <div class="card-content">
        <CodeBlock lang="plain">{{ data.configSchema }}</CodeBlock>
      </div>
    </b-collapse>

    <div v-if="data.commands.length">
      <h2 id="commands" class="z-title is-2 mt-2 mb-1">Commands</h2>
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
        <div v-if="command.config.info && command.config.info.description" class="content mt-1 mb-1" v-html="renderMarkdown(command.config.info.description)"></div>

        <b-collapse :open="false" class="card mt-1 mb-1">
          <div slot="trigger" slot-scope="props" class="card-header" role="button">
            <p class="card-header-title">Additional information</p>
            <a class="card-header-icon">
              <b-icon :icon="props.open ? 'menu-down' : 'menu-up'"></b-icon>
            </a>
          </div>
          <div class="card-content">
            Signatures:
            <ul class="z-list z-ul">
              <li>
                <code>
                  !{{ command.trigger }}
                  <span v-for="param in command.parameters">{{ renderParameter(param) }} </span>
                </code>
              </li>
            </ul>

            <div class="mt-2" v-if="command.parameters.length">
              Command arguments:
              <ul class="z-list z-ul">
                <li v-for="param in command.parameters">
                  <code>{{ renderParameter(param) }}</code>
                  <router-link :to="'/docs/descriptions/argument-types#' + (param.type || 'string')">{{ param.type || 'string' }}</router-link>
                  <div v-if="command.config.info && command.config.info.parameterDescriptions && command.config.info.parameterDescriptions[param.name]" class="content">
                    {{ renderMarkdown(command.config.info.parameterDescriptions[param.name]) }}
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </b-collapse>
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
      renderParameter(param) {
        let str = `${param.name}`;
        if (param.rest) str += '...';
        if (param.required) {
          return `<${str}>`;
        } else {
          return `[${str}]`;
        }
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
