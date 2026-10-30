import { rootEnv } from "#start/env";
import { defineConfig, services } from "@adonisjs/ally";

const allyConfig = defineConfig({
  discord: services.discord({
    clientId: rootEnv.get("CLIENT_ID"),
    clientSecret: rootEnv.get("CLIENT_SECRET"),
    callbackUrl: `${rootEnv.get("PORTAL_URL")}/oauth/discord/callback`,
    scopes: ["identify"],
  }),
});

export default allyConfig;

declare module "@adonisjs/ally/types" {
  interface SocialProviders extends InferSocialProviders<typeof allyConfig> {}
}
