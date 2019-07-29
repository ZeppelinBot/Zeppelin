import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import Splash from "./components/Splash.vue";
import Login from "./components/Login.vue";
import LoginCallback from "./components/LoginCallback.vue";
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
      component: () => import("./components/docs/Layout.vue"),
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
          path: "descriptions",
          component: () => import("./components/docs/descriptions/Layout.vue"),
          children: [
            {
              path: "argument-types",
              component: () => import("./components/docs/descriptions/ArgumentTypes.vue"),
            },
          ],
        },
        {
          path: "plugins",
          component: () => import("./components/docs/plugins/Layout.vue"),
          children: [
            {
              path: "mod-actions",
              component: () => import("./components/docs/plugins/ModActions.vue"),
            },
            {
              path: "locate-user",
              component: () => import("./components/docs/plugins/LocateUser.vue"),
            },
          ],
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

  scrollBehavior: function(to) {
    if (to.hash) {
      return {
        selector: to.hash,
      };
    }
  },
});
