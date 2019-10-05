<template>
  <div v-if="loading">
    Loading...
  </div>
  <div v-else>
    <h1 class="z-title is-1 mb-1">{{ data.info.prettyName || data.name }}</h1>

    <!-- Description -->
    <MarkdownBlock :content="data.info.description" class="content"></MarkdownBlock>

    <div class="tabs">
      <ul>
        <li v-bind:class="{'is-active': tab === 'usage'}">
          <router-link v-bind:to="'/docs/plugins/' + pluginName + '/usage'">Usage</router-link>
        </li>
        <li v-bind:class="{'is-active': tab === 'configuration'}">
          <router-link v-bind:to="'/docs/plugins/' + pluginName + '/configuration'">Configuration</router-link>
        </li>
      </ul>
    </div>

    <!-- Usage tab -->
    <div class="usage" v-if="tab === 'usage'">
      <div v-if="!hasUsageInfo">
        This plugin has no usage information.
        See <router-link v-bind:to="'/docs/plugins/' + pluginName + '/configuration'">Configuration</router-link>.
      </div>

      <!-- Usage guide -->
      <div v-if="data.info.usageGuide">
        <h2 id="usage-guide" class="z-title is-2 mt-2 mb-1">Usage guide</h2>
        <MarkdownBlock :content="data.info.usageGuide" class="content"></MarkdownBlock>
      </div>

      <!-- Command list -->
      <div v-if="data.commands.length">
        <h2 id="commands" class="z-title is-2 mt-2 mb-1">Commands</h2>
        <div v-for="command in data.commands">
          <h3 class="z-title is-3 mt-2 mb-1">!{{ command.trigger }}</h3>
          <div v-if="command.config.extra.requiredPermission">
            Permission: <code>{{ command.config.extra.requiredPermission }}</code>
          </div>
          <div v-if="command.config.extra.info && command.config.extra.info.basicUsage">
            Basic usage: <code>{{ command.config.extra.info.basicUsage }}</code>
          </div>
          <div v-if="command.config.aliases && command.config.aliases.length">
            Shortcut:
            <code style="margin-right: 4px" v-for="alias in command.config.aliases">!{{ alias }}</code>
          </div>

          <MarkdownBlock v-if="command.config.info && command.config.info.description" :content="command.config.info.description" class="content mt-1 mb-1"></MarkdownBlock>

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
                    <router-link :to="'/docs/reference/argument-types#' + (param.type || 'string')">{{ param.type || 'string' }}</router-link>
                    <MarkdownBlock v-if="command.config.info && command.config.info.parameterDescriptions && command.config.info.parameterDescriptions[param.name]"
                                   :content="command.config.info.parameterDescriptions[param.name]"
                                   class="content">
                    </MarkdownBlock>
                  </li>
                </ul>
              </div>

              <div class="mt-2" v-if="command.config.options && command.config.options.length">
                Options:
                <ul class="z-list z-ul">
                  <li v-for="opt in command.config.options">
                    <code>{{ renderOption(opt) }}</code>
                    <router-link :to="'/docs/reference/argument-types#' + (opt.type || 'string')">{{ opt.type || 'string' }}</router-link>
                    <MarkdownBlock v-if="command.config.info && command.config.info.optionDescriptions && command.config.info.optionDescriptions[opt.name]"
                                   :content="command.config.info.optionDescriptions[opt.name]"
                                   class="content">
                    </MarkdownBlock>
                  </li>
                </ul>
              </div>
            </div>
          </b-collapse>
        </div>
      </div>
    </div>

    <!-- Configuration tab -->
    <div class="configuration" v-if="tab === 'configuration'">
      <!-- Basic config info -->
      <p class="mb-1">
        Name in config: <code>{{ data.name }}</code>
      </p>
      <p class="mt-1 mb-1">
        To enable this plugin with default configuration, add <code>{{ data.name }}: {}</code> to the <code>plugins</code> list in config
      </p>

      <!-- Configuration guide -->
      <div v-if="data.info.configurationGuide">
        <h2 id="configuration-guide" class="z-title is-2 mt-2 mb-1">Configuration guide</h2>
        <MarkdownBlock :content="data.info.configurationGuide" class="content"></MarkdownBlock>
      </div>

      <!-- Default configuration -->
      <h2 id="default-configuration" class="z-title is-2 mt-2 mb-1">Default configuration</h2>
      <CodeBlock lang="yaml">{{ renderConfiguration(data.defaultOptions) }}</CodeBlock>

      <!-- Config schema -->
      <h2 id="config-schema" class="z-title is-2 mt-2 mb-1">Config schema</h2>
      <b-collapse :open="false" class="card mt-1 mb-1">
        <div slot="trigger" slot-scope="props" class="card-header" role="button">
          <p class="card-header-title">Click to expand</p>
          <a class="card-header-icon">
            <b-icon :icon="props.open ? 'menu-up' : 'menu-down'"></b-icon>
          </a>
        </div>
        <div class="card-content">
          <CodeBlock lang="plain">{{ data.configSchema }}</CodeBlock>
        </div>
      </b-collapse>
    </div>
  </div>
</template>

<script>
  import Vue from "vue";
  import {mapState} from "vuex";
  import yaml from "js-yaml";
  import CodeBlock from "./CodeBlock";
  import MarkdownBlock from "./MarkdownBlock";

  const validTabs = ['usage', 'configuration'];
  const defaultTab = 'usage';

  export default {
    components: { CodeBlock, MarkdownBlock },

    async mounted() {
      this.loading = true;

      await this.$store.dispatch("docs/loadPluginData", this.pluginName);

      // If there's no usage info, use Configuration as the default tab
      if (!this.hasUsageInfo && ! this.$route.params.tab) {
        this.tab = 'configuration';
      }

      this.loading = false;
    },
    methods: {
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
      renderOption(opt) {
        let str = `--${opt.name}`;
        if (opt.shortcut) {
          str += `|-${opt.shortcut}`;
        }
        if (opt.required) {
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
        tab: validTabs.includes(this.$route.params.tab)
          ? this.$route.params.tab
          : defaultTab,
      };
    },
    computed: {
      ...mapState("docs", {
        data(state) {
          return state.plugins[this.pluginName];
        },
        hasUsageInfo() {
          if (!this.data) return true;
          if (this.data.commands.length) return true;
          if (this.data.info.usageGuide) return true;
          return false;
        },
      }),
    },
  }
</script>
