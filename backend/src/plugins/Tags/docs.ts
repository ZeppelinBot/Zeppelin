import { ZeppelinPluginDocs } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { TemplateFunctions } from "./templateFunctions.js";
import { TemplateFunction, zTagsConfig } from "./types.js";

export const tagsPluginDocs: ZeppelinPluginDocs = {
  type: "stable",
  prettyName: "Tags",
  description: "Tags are a way to store and reuse information.",
  configurationGuide: trimPluginDescription(`
    ### Template Functions
    You can use template functions in your tags. These functions are called when the tag is rendered.
    You can use these functions to render dynamic content, or to access information from the message and/or user calling the tag.
    You use them by adding a \`{}\` on your tag.

    Here are the functions you can use in your tags:

    ${generateTemplateMarkdown(TemplateFunctions)}
  `),
  configSchema: zTagsConfig,
};

function generateTemplateMarkdown(definitions: TemplateFunction[]): string {
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
