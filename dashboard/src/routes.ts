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
      component: () => import("./components/Docs/Layout.vue"),
      children: [
        {
          path: "",
          component: () => import("./components/Docs/Introduction.vue"),
        },
        {
          path: "configuration-format",
          component: () => import("./components/Docs/ConfigurationFormat.vue"),
        },
        {
          path: "permissions",
          component: () => import("./components/Docs/Permissions.vue"),
        },
        {
          path: "plugin-configuration",
          component: () => import("./components/Docs/PluginConfiguration.vue"),
        },
      ],
    },

    // Dashboard
    {
      path: "/dashboard",
      component: () => import("./components/Dashboard/Layout.vue"),
      beforeEnter: authGuard,
      children: [
        {
          path: "",
          component: () => import("./components/Dashboard/GuildList.vue"),
        },
        {
          path: "guilds/:guildId/config",
          component: () => import("./components/Dashboard/GuildConfigEditor.vue"),
        },
      ],
    },
  ],
});
