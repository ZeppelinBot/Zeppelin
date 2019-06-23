import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import Splash from "./components/Splash.vue";
import Login from "./components/Login.vue";
import LoginCallback from "./components/LoginCallback.vue";
import DashboardGuildList from "./components/DashboardGuildList.vue";
import DashboardGuildConfigEditor from "./components/DashboardGuildConfigEditor.vue";
import Dashboard from "./components/Dashboard.vue";
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
      component: Dashboard,
      beforeEnter: authGuard,
      children: [
        {
          path: "",
          component: DashboardGuildList,
        },
        {
          path: "guilds/:guildId/config",
          component: DashboardGuildConfigEditor,
        },
      ],
    },
  ],
});
