import { ZeppelinPluginDocs } from "../../types.js";
import { zCommandAliasesConfig } from "./types.js";

export const commandAliasesPluginDocs: ZeppelinPluginDocs = {
  type: "stable",
  prettyName: "Command Aliases",
  configSchema: zCommandAliasesConfig,
  description: "This plugin lets you create shortcuts for existing commands.",
  usageGuide: `
For example, you can make \`!b\` work the same as \`!ban\`, or \`!c\` work the same as \`!cases\`.

### Example

\`\`\`yaml
plugins:
  command_aliases:
    config:
      aliases:
        "b": "ban"
        "c": "cases"
        "b2": "ban -d 2"
        "ownerinfo": "info 754421392988045383"
\`\`\`

With this setup:
- \`!b @User\` runs \`!ban @User\`
- \`!c\` runs \`!cases\`
- \`!b2 @User\` runs \`!ban -d 2 @User\`
- \`!ownerinfo\` runs \`!info 754421392988045383\`
  `
};
