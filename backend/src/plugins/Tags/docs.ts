import { trimPluginDescription } from "src/utils";
import { TemplateFunction } from "./types";

export function generateTemplateMarkdown(definitions: TemplateFunction[]): string {
  return definitions
    .map((def) => {
      const usage = def.signature ?? `(${def.arguments.join(", ")})`;
      const examples = def.examples?.map((ex) => `> \`{${ex}}\``).join("\n") ?? null;
      return trimPluginDescription(`
        ## ${def.name}
        **${def.description}**\n
        __Usage__: \`{${def.name}${usage}}\`\n
        ${examples ? `__Examples__:\n${examples}` : ""}\n\n
      `);
    })
    .join("\n\n");
}
