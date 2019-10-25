<template>
  <div v-if="loading">
    Loading...
  </div>
  <div v-else>
    <h1>{{ data.info.prettyName || data.name }}</h1>

    <!-- Description -->
    <MarkdownBlock :content="data.info.description" class="content"></MarkdownBlock>

    <Tabs>
      <Tab :active="tab === 'usage'">
        <router-link class="unstyled" v-bind:to="'/docs/plugins/' + pluginName + '/usage'">Usage</router-link>
      </Tab>
      <Tab :active="tab === 'configuration'">
        <router-link class="unstyled" v-bind:to="'/docs/plugins/' + pluginName + '/configuration'">Configuration</router-link>
      </Tab>
    </Tabs>

    <!-- Usage tab -->
    <div class="usage" v-if="tab === 'usage'">
      <div v-if="!hasUsageInfo">
        This plugin has no usage information.
        See <router-link v-bind:to="'/docs/plugins/' + pluginName + '/configuration'">Configuration</router-link>.
      </div>

      <!-- Usage guide -->
      <div v-if="data.info.usageGuide">
        <h2 id="usage-guide">Usage guide</h2>
        <MarkdownBlock :content="data.info.usageGuide" class="content" />
      </div>

      <!-- Command list -->
      <div v-if="data.commands.length">
        <h2 id="commands">Commands</h2>
        <div v-for="command in data.commands"
             class="command mb-4"
             v-bind:ref="getCommandSlug(command.trigger)" v-bind:class="{target: targetCommandId === getCommandSlug(command.trigger)}">
          <h3 class="text-xl mb-0">
            !{{ command.trigger }}
            <span v-for="alias in command.config.aliases"> <span class="text-gray-600">/</span> !{{ alias }}</span>
          </h3>
          <MarkdownBlock v-if="command.config.extra.info && command.config.extra.info.description"
                         :content="command.config.extra.info.description"
                         class="content" />

          <div v-bind:class="{'-mt-2': command.config.extra.info && command.config.extra.info.description}">
            <div v-if="command.config.extra.info && command.config.extra.info.basicUsage">
              <span class="font-semibold">Basic usage:</span> <code class="inline-code">{{ command.config.extra.info.basicUsage }}</code>
            </div>
          </div>

          <Expandable class="mt-4">
            <template v-slot:title>Additional information</template>
            <template v-slot:content>
              <div v-if="command.config.extra.info && command.config.extra.info.usageGuide">
                <div class="font-semibold">Usage guide:</div>
                <MarkdownBlock :content="command.config.extra.info.usageGuide"
                               class="content">
                </MarkdownBlock>
              </div>

              <div v-if="command.config.extra.info && command.config.extra.info.examples">
                <div class="font-semibold">Examples:</div>
                <MarkdownBlock :content="command.config.extra.info.examples"
                               class="content">
                </MarkdownBlock>
              </div>

              <p v-if="command.config.extra.requiredPermission">
                <span class="font-semibold">Permission:</span>
                <code class="inline-code">{{ command.config.extra.requiredPermission }}</code>
              </p>

              <span class="font-semibold">Signatures:</span>
              <ul>
                <li>
                  <code class="inline-code bg-gray-900">
                    !{{ command.trigger }}
                    <span v-for="param in command.parameters">{{ renderParameter(param) }} </span>
                  </code>
                </li>
              </ul>

              <div class="mt-2" v-if="command.parameters.length">
                <span class="font-semibold">Command arguments:</span>
                <ul>
                  <li v-for="param in command.parameters">
                    <code>{{ renderParameter(param) }}</code>
                    <router-link :to="'/docs/reference/argument-types#' + (param.type || 'string')">{{ param.type || 'string' }}</router-link>
                    <MarkdownBlock v-if="command.config.extra.info && command.config.extra.info.parameterDescriptions && command.config.extra.info.parameterDescriptions[param.name]"
                                   :content="command.config.extra.info.parameterDescriptions[param.name]"
                                   class="content">
                    </MarkdownBlock>
                  </li>
                </ul>
              </div>

              <div class="mt-2" v-if="command.config.options && command.config.options.length">
                <span class="font-semibold">Options:</span>
                <ul>
                  <li v-for="opt in command.config.options">
                    <code>{{ renderOption(opt) }}</code>
                    <router-link :to="'/docs/reference/argument-types#' + (opt.type || 'string')">{{ opt.type || 'string' }}</router-link>
                    <MarkdownBlock v-if="command.config.extra.info && command.config.extra.info.optionDescriptions && command.config.extra.info.optionDescriptions[opt.name]"
                                   :content="command.config.extra.info.optionDescriptions[opt.name]"
                                   class="content">
                    </MarkdownBlock>
                  </li>
                </ul>
              </div>
            </template>
          </Expandable>
        </div>
      </div>
    </div>

    <!-- Configuration tab -->
    <div class="configuration" v-if="tab === 'configuration'">
      <!-- Basic config info -->
      <p>
        <strong>Name in config:</strong> <code>{{ data.name }}</code><br>
        To enable this plugin with default configuration, add <code>{{ data.name }}: {}</code> to the <code>plugins</code> list in config
      </p>

      <!-- Configuration guide -->
      <div v-if="data.info.configurationGuide">
        <h2 id="configuration-guide">Configuration guide</h2>
        <MarkdownBlock :content="data.info.configurationGuide" class="content"></MarkdownBlock>
      </div>

      <!-- Default configuration -->
      <h2 id="default-configuration">Default configuration</h2>
      <CodeBlock code-lang="yaml">{{ renderConfiguration(data.defaultOptions) }}</CodeBlock>

      <!-- Config schema -->
      <h2 id="config-schema">Config schema</h2>
      <Expandable class="wide">
        <template v-slot:title>Click to expand</template>
        <template v-slot:content>
          <CodeBlock code-lang="plain">{{ data.configSchema }}</CodeBlock>
        </template>
      </Expandable>
    </div>
  </div>
</template>

<style scoped>
  .command.target {
    @apply mt-5 mb-3;
    @apply pt-2 pb-2 pl-4 pr-4;
    @apply border;
    @apply border-gray-400;
    @apply border-dashed;
    @apply rounded;
  }
</style>

<script lang="ts">
  import Vue from "vue";
  import {mapState} from "vuex";
  import yaml from "js-yaml";
  import CodeBlock from "./CodeBlock.vue";
  import MarkdownBlock from "./MarkdownBlock.vue";
  import Tabs from "../Tabs.vue";
  import Tab from "../Tab.vue";
  import Expandable from "../Expandable.vue";
  import { DocsState } from "../../store/types";

  const validTabs = ['usage', 'configuration'];
  const defaultTab = 'usage';

  export default {
    components: { CodeBlock, MarkdownBlock, Tabs, Tab, Expandable },

    async mounted() {
      this.loading = true;

      await this.$store.dispatch("docs/loadPluginData", this.pluginName);

      // If there's no usage info, use Configuration as the default tab
      if (!this.hasUsageInfo && ! this.$route.params.tab) {
        this.tab = 'configuration';
      }

      this.loading = false;

      this.$nextTick(() => {
        if (this.tab === "usage" && window.location.hash) {
          this.scrollToCommand(window.location.hash.slice(1));
        }
      });

      this.hashChangeListener = () => this.scrollToCommand(window.location.hash.slice(1));
      window.addEventListener('hashchange', this.hashChangeListener);
    },
    beforeDestroy() {
      window.removeEventListener('hashchange', this.hashChangeListener);
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
        let str = `-${opt.name}`;
        if (opt.shortcut) {
          str += `|-${opt.shortcut}`;
        }
        if (opt.required) {
          return `<${str}>`;
        } else {
          return `[${str}]`;
        }
      },
      getCommandSlug(str) {
        return 'command-' + str.trim().toLowerCase().replace(/\s/g, '-');
      },
      scrollToCommand(hash) {
        if (this.$refs[hash]) {
          this.targetCommandId = hash;
          (this.$refs[hash][0] as Element).scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        } else {
          this.targetCommandId = null;
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
        targetCommandId: null,
        hashChangeListener: null
      };
    },
    computed: {
      ...mapState("docs", {
        data(state: DocsState) {
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
