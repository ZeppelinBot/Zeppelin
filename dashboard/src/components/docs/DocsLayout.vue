<template>
  <div class="docs container mx-auto px-6 py-6">
    <Title title="Zeppelin - Documentation" />

    <!-- Top bar -->
    <nav class="flex items-stretch pl-4 pr-2 py-1 border border-gray-700 rounded bg-gray-800 shadow-xl">
      <div class="flex-initial flex items-center">
        <img class="flex-auto w-10 mr-5" src="../../img/logo.png" alt="" aria-hidden="true" />

        <router-link to="/docs">
          <h1 class="flex-auto font-semibold">Zeppelin Documentation</h1>
        </router-link>
      </div>
      <div class="flex-1 flex items-center justify-end">
        <router-link to="/dashboard" role="menuitem" class="py-1 px-2 rounded hover:bg-gray-700 hidden lg:block">
          Go to dashboard
        </router-link>
        <button class="link-button text-2xl leading-zero lg:hidden" v-on:click="toggleMobileMenu()" aria-hidden="true">
          <Menu />
        </button>
      </div>
    </nav>

    <a class="sr-only-when-not-focused text-center block py-2" href="#main-anchor">Skip to main content</a>

    <!-- Content wrapper -->
    <div class="flex flex-wrap items-start mt-8">
      <!-- Sidebar -->
      <nav
        class="docs-sidebar px-4 pt-2 pb-3 mr-8 mb-4 border border-gray-700 rounded bg-gray-800 shadow-md flex-full lg:flex-none lg:block"
        v-bind:class="{ closed: !mobileMenuOpen }"
      >
        <div role="none" v-for="(group, index) in menu">
          <h1 class="font-bold" :aria-owns="'menu-group-' + index" :class="{ 'mt-4': index !== 0 }">
            {{ group.label }}
          </h1>
          <ul v-bind:id="'menu-group-' + index" role="group" class="list-none pl-2">
            <li role="none" v-for="item in group.items">
              <router-link
                role="menuitem"
                :to="item.to"
                class="text-gray-300 hover:text-gray-500"
                v-on:click.native="onChooseMenuItem()"
                >{{ item.label }}</router-link
              >
            </li>
          </ul>
        </div>
      </nav>

      <!-- Content -->
      <main class="docs-content main-content flex-flexible overflow-x-hidden">
        <a id="main-anchor" ref="main-anchor" tabindex="-1" class="sr-only"></a>
        <router-view :key="$route.fullPath"></router-view>
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";
import Menu from "vue-material-design-icons/Menu.vue";
import Title from "../Title.vue";

type TMenuItem = {
  to: string;
  label: string;
};
type TMenuGroup = {
  label: string;
  items: TMenuItem[];
};
type TMenu = TMenuGroup[];

const menu: TMenu = [
  {
    label: "General",
    items: [
      {
        to: "/docs/introduction",
        label: "Introduction",
      },
    ],
  },

  {
    label: "Configuration",
    items: [
      {
        to: "/docs/configuration/configuration-format",
        label: "Configuration format",
      },
      {
        to: "/docs/configuration/plugin-configuration",
        label: "Plugin configuration",
      },
      {
        to: "/docs/configuration/permissions",
        label: "Permissions",
      },
    ],
  },

  {
    label: "Reference",
    items: [
      {
        to: "/docs/reference/argument-types",
        label: "Argument types",
      },
    ],
  },

  {
    label: "Setup guides",
    items: [
      {
        to: "/docs/setup-guides/logs",
        label: "Logs",
      },
      {
        to: "/docs/setup-guides/moderation",
        label: "Moderation",
      },
      {
        to: "/docs/setup-guides/counters",
        label: "Counters",
      },
    ],
  },
];

export default {
  components: { Menu, Title },
  async mounted() {
    await this.$store.dispatch("docs/loadAllPlugins");
  },

  data() {
    return {
      mobileMenuOpen: false,
    };
  },

  methods: {
    toggleMobileMenu() {
      this.mobileMenuOpen = !this.mobileMenuOpen;
    },

    onChooseMenuItem() {
      this.mobileMenuOpen = false;
      this.$refs["main-anchor"].focus();
    },
  },

  computed: {
    ...mapState("docs", {
      plugins: "allPlugins",
    }),
    menu() {
      console.log(this.plugins);

      return [
        ...menu,
        {
          label: "Plugins",
          items: this.plugins
            .filter(plugin => !plugin.info.legacy)
            .map(plugin => ({
              label: plugin.info.prettyName || plugin.name,
              to: `/docs/plugins/${plugin.name}`,
            })),
        },
        {
          label: "Legacy Plugins",
          items: this.plugins
            .filter(plugin => plugin.info.legacy)
            .map(plugin => ({
              label: plugin.info.prettyName || plugin.name,
              to: `/docs/plugins/${plugin.name}`,
            })),
        },
      ];
    },
  },
};
</script>
