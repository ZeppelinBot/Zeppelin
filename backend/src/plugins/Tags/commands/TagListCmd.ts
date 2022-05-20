import { sendErrorMessage } from "src/pluginUtils";

import { commandTypeHelpers as ct } from "../../../commandTypes";
import { createChunkedMessage } from "../../../utils";
import { tagsCmd } from "../types";

export const TagListCmd = tagsCmd({
  trigger: ["tag list", "tags", "taglist"],
  permission: "can_list",

  signature: {
    noaliases: ct.bool({ option: true, isSwitch: true, shortcut: "na" }),
    aliasesonly: ct.bool({ option: true, isSwitch: true, shortcut: "ao" }),
    tag: ct.string({ option: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const prefix = (await pluginData.config.getForMessage(msg)).prefix;
    const tags = await pluginData.state.tags.all();
    if (tags.length === 0) {
      msg.channel.send(`No tags created yet! Use \`tag create\` command to create one.`);
      return;
    }

    const allAliases = await pluginData.state.tagAliases.all();

    if (args.aliasesonly) {
      let aliasesArr: string[] = [];
      if (args.tag) {
        const tag = await pluginData.state.tags.find(args.tag);
        if (!tag) {
          sendErrorMessage(pluginData, msg.channel, `Tag \`${args.tag}\` doesn't exist.`);
          return;
        }
        const aliasesForTag = await pluginData.state.tagAliases.findAllWithTag(args.tag);
        if (!aliasesForTag) {
          sendErrorMessage(pluginData, msg.channel, `No aliases for tag \`${args.tag}\`.`);
          return;
        }
        aliasesArr = aliasesForTag.map((a) => a.alias);
        createChunkedMessage(
          msg.channel,
          `Available aliases for tag \`${args.tag}\` (use with \`${prefix}alias\`: \`\`\`${aliasesArr.join(
            ", ",
          )}\`\`\``,
        );
        return;
      }
      aliasesArr = allAliases.map((a) => a.alias);
      createChunkedMessage(
        msg.channel,
        `Available aliases (use with \`${prefix}alias\`: \`\`\`${aliasesArr.join(", ")}\`\`\``,
      );
      return;
    }

    const tagNames = tags.map((tag) => tag.tag).sort();
    const tagAliasesNames = allAliases.map((alias) => alias.alias).sort();
    const tagAndAliasesNames = tagNames
      .join(", ")
      .concat(args.noaliases ? "" : tagAliasesNames.length > 0 ? `, ${tagAliasesNames.join(", ")}` : "");

    createChunkedMessage(
      msg.channel,
      `Available tags (use with ${prefix}tag/alias): \`\`\`${tagAndAliasesNames}\`\`\``,
    );
  },
});
