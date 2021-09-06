import { TemplateFunction } from "./types";

export function generateTemplateMarkdown(definitions: TemplateFunction[]): string {
  const table = definitions
    .map(def => {
      const argsString = def.signature ?? `(${def.arguments.join(", ")})`;
      const usage = def.signature ? `| ${def.signature} |` : argsString;
      const exampl = def.examples ? def.examples.map(ex => `> ${ex}`).join("\n") : "";
      return `
            #### ${def.name}
            \`${usage}\`
            **${def.description}**
            ${exampl}
        `;
    })
    .join("\n\n");

  return table;
}
