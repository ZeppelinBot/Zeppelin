import { defineConfig, Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwind from "@tailwindcss/vite";

function htmlImport(): Plugin {
  return {
    name: "html-import",
    transform(code, id) {
      if (id.endsWith(".html")) {
        return {
          code: `export default ${JSON.stringify(code)};`,
          map: null,
        };
      }
      return null;
    },
  };
}

export default defineConfig((configEnv) => {
  return {
    server: {
      port: 3002,
      host: "0.0.0.0",
      allowedHosts: true,
    },
    plugins: [
      vue({
        template: {
          compilerOptions: {
            // Needed to prevent hardcoded code blocks from breaking in docs
            whitespace: "preserve",
          },
        },
      }),
      tailwind(),
      htmlImport(),
    ],
  };
});
