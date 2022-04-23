import { commandTypeHelpers as ct } from "../../../commandTypes";
import { createChunkedMessage } from "../../../utils";
import { tagsCmd } from "../types";

export const TagListCmd = tagsCmd({
  trigger: ["tag list", "tags", "taglist"],
  permission: "can_list",

  signature: {
    noaliases: ct.bool({ option: true, isSwitch: true, shortcut: "na" }),
  },

  async run({ message: msg, args, pluginData }) {
    const prefix = (await pluginData.config.getForMessage(msg)).prefix;
    const tags = await pluginData.state.tags.all();
    const aliases = await pluginData.state.tagAliases.all();
    if (tags.length === 0) {
      msg.channel.send(`No tags created yet! Use \`tag create\` command to create one.`);
      return;
    }

    const tagNames = tags.map((tag) => tag.tag).sort();
    const tagAliasesNames = aliases.map((alias) => alias.alias).sort();
    const tagAndAliasesNames = tagNames
      .join(", ")
      .concat(args.noaliases ? "" : tagAliasesNames.length > 0 ? `, ${tagAliasesNames.join(", ")}` : "");

    createChunkedMessage(msg.channel, `Available tags (use with ${prefix}tag): \`\`\`${tagAndAliasesNames}\`\`\``);
  },
});
