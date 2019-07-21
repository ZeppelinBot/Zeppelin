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

    // Dashboard
    {
      path: "/dashboard",
      component: () => import("./components/Dashboard.vue"),
      beforeEnter: authGuard,
      children: [
        {
          path: "",
          component: () => import("./components/DashboardGuildList.vue"),
        },
        {
          path: "guilds/:guildId/config",
          component: () => import("./components/DashboardGuildConfigEditor.vue"),
        },
      ],
    },
  ],
});
