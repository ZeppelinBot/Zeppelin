import { hooks } from "@adonisjs/core/app";

/**
 * Custom hook to load inertia pages from feature folders, e.g. `features/docs/pages/DocsIndex.vue`
 */
export default hooks.init((_parent, _manager, generator) => {
  generator.add("inertiaPages", {
    source: "./inertia",
    glob: ["**/pages/*.vue"],
    output: "./.adonisjs/server/pages.d.ts",

    as(vfs, buffer, _config, helpers) {
      const pages = vfs.asList();

      buffer.writeLine(`import '@adonisjs/inertia/types'`);
      buffer.writeLine(`
        import type {
          VNodeProps,
          AllowedComponentProps,
          ComponentInstance
        } from 'vue'

        type ExtractProps<T> = Omit<
          ComponentInstance<T>['$props'],
          keyof VNodeProps | keyof AllowedComponentProps
        >
      `);

      buffer.writeLine(`declare module '@adonisjs/inertia/types' {`).indent();

      buffer.writeLine(`export interface InertiaPages {`).indent();

      for (const [name, file] of Object.entries(pages)) {
        buffer.writeLine(`'${name}': ExtractProps<(typeof import('${helpers.toImportPath(file)}'))['default']>`);
      }

      buffer.dedent().writeLine("}");
      buffer.dedent().writeLine("}");
    },
  });
});
