import { commandTypeHelpers as ct } from "../../../commandTypes";
import { createChunkedMessage } from "../../../utils";
import { tagsCmd } from "../types";

export const TagListAliasesCmd = tagsCmd({
  trigger: ["tag list-aliases", "tagaliases"],
  permission: "can_list",

  signature: {
    tag: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    const prefix = (await pluginData.config.getForMessage(msg)).prefix;
    const aliases = await pluginData.state.tagAliases.findAllWithTag(args.tag);
    let aliasesArr: string[] = [];
    if (!aliases) {
      msg.channel.send(`No aliases found for tag \`${args.tag}\``);
      return;
    }
    aliasesArr = aliases.map((a) => a.alias);
    createChunkedMessage(
      msg.channel,
      `Available aliases for tag \`${args.tag}\` (use with \`${prefix}alias\`: \`\`\`${aliasesArr.join(", ")}\`\`\``,
    );
    return;
  },
});
