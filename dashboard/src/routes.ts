import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import Index from "./components/Index.vue";
import Login from "./components/Login.vue";
import LoginCallback from "./components/LoginCallback.vue";
import GuildConfigEditor from "./components/GuildConfigEditor.vue";
import Dashboard from "./components/Dashboard.vue";
import { authGuard, loginCallbackGuard } from "./auth";

Vue.use(VueRouter);

const publicRoutes: RouteConfig[] = [
  { path: "/", component: Index },
  { path: "/login", component: Login },
  { path: "/login-callback", beforeEnter: loginCallbackGuard },
];

const authenticatedRoutes: RouteConfig[] = [
  { path: "/dashboard", component: Dashboard },
  { path: "/dashboard/guilds/:guildId/config", component: GuildConfigEditor },
];

authenticatedRoutes.forEach(route => {
  route.beforeEnter = authGuard;
});

export const router = new VueRouter({
  mode: "history",
  routes: [...publicRoutes, ...authenticatedRoutes],
});
