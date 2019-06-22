import { NavigationGuard } from "vue-router";
import { RootStore } from "./store";

export const authGuard: NavigationGuard = async (to, from, next) => {
  if (RootStore.state.auth.apiKey) return next(); // We have an API key -> authenticated
  if (RootStore.state.auth.loadedInitialAuth) return next("/login"); // No API key and initial auth data was already loaded -> not authenticated
  await RootStore.dispatch("auth/loadInitialAuth"); // Initial auth data wasn't loaded yet (per above check) -> load it now
  if (RootStore.state.auth.apiKey) return next();
  next("/login"); // Still no API key -> not authenticated
};

export const loginCallbackGuard: NavigationGuard = async (to, from, next) => {
  await RootStore.dispatch("auth/setApiKey", to.query.apiKey);
  next("/dashboard");
};
