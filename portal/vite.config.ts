import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import adonisjs from "@adonisjs/vite/client";
import { Env } from "@adonisjs/core/env";

export const buildEnv = await Env.create(new URL("../../", import.meta.url), {
  DEVELOPMENT_VITE_ALLOWED_HOSTS: Env.schema.string.optional(),
  DEVELOPMENT_PORTAL_PORT: Env.schema.number.optional(),
});

const allowedHosts = buildEnv
  .get("DEVELOPMENT_VITE_ALLOWED_HOSTS", "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [vue(), adonisjs({ entryPoints: ["inertia/app.ts"], reload: ["resources/views/**/*.edge"] })],

  server: {
    watch: {
      ignored: ["**/storage/**", "**/tmp/**"],
    },
    allowedHosts,
    ws: {
      port: 3004,
      clientPort: buildEnv.get("DEVELOPMENT_PORTAL_PORT", 3400),
    },
  },
});
