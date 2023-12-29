import Vue from "vue";
import VueRouter from "vue-router";
import { authGuard, authRedirectGuard, loginCallbackGuard } from "./auth";

Vue.use(VueRouter);

export const router = new VueRouter({
  mode: "history",
  routes: [
    { path: "/login", beforeEnter: authRedirectGuard },
    { path: "/login-callback", beforeEnter: loginCallbackGuard },

    // Privacy policy
    {
      path: "/privacy-policy",
      component: () => import("./components/PrivacyPolicy.vue"),
    },

    // Docs
    {
      path: "/docs",
      component: () => import("./components/docs/DocsLayout.vue"),
      children: [
        {
          path: "",
          redirect: "/docs/introduction",
        },
        {
          path: "introduction",
          component: () => import("./components/docs/Introduction.vue"),
        },
        {
          path: "configuration/configuration-format",
          component: () => import("./components/docs/ConfigurationFormat.vue"),
        },
        {
          path: "configuration/permissions",
          component: () => import("./components/docs/Permissions.vue"),
        },
        {
          path: "configuration/plugin-configuration",
          component: () => import("./components/docs/PluginConfiguration.vue"),
        },
        {
          path: "reference/argument-types",
          component: () => import("./components/docs/ArgumentTypes.vue"),
        },
        {
          path: "setup-guides/logs",
          component: () => import("./components/docs/WorkInProgress.vue"),
        },
        {
          path: "setup-guides/moderation",
          component: () => import("./components/docs/WorkInProgress.vue"),
        },
        {
          path: "setup-guides/counters",
          component: () => import("./components/docs/Counters.vue"),
        },
        {
          path: "plugins/:pluginName/:tab?",
          component: () => import("./components/docs/Plugin.vue"),
        },
      ],
    },

    // Dashboard
    {
      path: "/dashboard",
      component: () => import("./components/dashboard/Layout.vue"),
      beforeEnter: authGuard,
      children: [
        {
          path: "",
          component: () => import("./components/dashboard/GuildList.vue"),
        },
        {
          path: "guilds/:guildId/info",
          component: () => import("./components/dashboard/GuildInfo.vue"),
        },
        {
          path: "guilds/:guildId/config",
          component: () => import("./components/dashboard/GuildConfigEditor.vue"),
        },
        {
          path: "guilds/:guildId/access",
          component: () => import("./components/dashboard/GuildAccess.vue"),
        },
        {
          path: "guilds/:guildId/import-export",
          component: () => import("./components/dashboard/GuildImportExport.vue"),
        },
      ],
    },
  ],

  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return {
        selector: to.hash,
      };
    } else if (savedPosition) {
      return savedPosition;
    } else {
      return { x: 0, y: 0 };
    }
  },
});
