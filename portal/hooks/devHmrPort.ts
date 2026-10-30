import { hooks } from "@adonisjs/core/app";

// AdonisJS internals override VITE_HMR_PORT env var.
// This overrides that override (yo dawg) with our own value.
export default hooks.devServerStarting((server) => {
  server.options.env = {
    ...server.options.env,
    VITE_HMR_PORT: "3004",
  };
});
