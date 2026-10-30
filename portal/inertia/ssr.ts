import { client } from "#frontend/client.js";
import { createInertiaApp } from "@inertiajs/vue3";
import { TuyauProvider } from "@adonisjs/inertia/vue";
import { renderToString } from "@vue/server-renderer";
import { createSSRApp, h, type DefineComponent } from "vue";
import { resolvePageComponent } from "@adonisjs/inertia/helpers";

export default function render(page: any) {
  return createInertiaApp({
    page,
    render: renderToString,
    resolve: (name) => {
      return resolvePageComponent(
        `./${name}.vue`,
        import.meta.glob<DefineComponent>("./**/pages/*.vue", { eager: true }),
      );
    },
    setup: ({ App, props, plugin }) => {
      return createSSRApp({
        render: () => h(TuyauProvider, { client }, { default: () => h(App, props) }),
      }).use(plugin);
    },
  });
}
