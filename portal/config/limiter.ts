import { portalEnv } from "#start/env";
import { defineConfig, stores } from "@adonisjs/limiter";

const limiterConfig = defineConfig({
  default: portalEnv.get("LIMITER_STORE") ?? "redis",
  stores: {
    redis: stores.redis({
      keyPrefix: "portal:limiter:",
    }),

    memory: stores.memory({}),
  },
});

export default limiterConfig;

declare module "@adonisjs/limiter/types" {
  export interface LimitersList extends InferLimiters<typeof limiterConfig> {}
}
