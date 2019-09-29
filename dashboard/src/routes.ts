import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import Splash from "./components/Splash.vue";
import { authGuard, authRedirectGuard, loginCallbackGuard } from "./auth";

Vue.use(VueRouter);

export const router = new VueRouter({
  mode: "history",
  routes: [
    { path: "/", component: Splash },
    { path: "/login", beforeEnter: authRedirectGuard },
    { path: "/login-callback", beforeEnter: loginCallbackGuard },

    // Docs
    {
      path: "/docs",
      component: () => import("./components/docs/DocsLayout.vue"),
      children: [
        {
          path: "",
          component: () => import("./components/docs/Introduction.vue"),
        },
        {
          path: "configuration-format",
          component: () => import("./components/docs/ConfigurationFormat.vue"),
        },
        {
          path: "permissions",
          component: () => import("./components/docs/Permissions.vue"),
        },
        {
          path: "plugin-configuration",
          component: () => import("./components/docs/PluginConfiguration.vue"),
        },
        {
          path: "descriptions/argument-types",
          component: () => import("./components/docs/ArgumentTypes.vue"),
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
          path: "guilds/:guildId/config",
          component: () => import("./components/dashboard/GuildConfigEditor.vue"),
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
