import { tagsCmd } from "../types";
import { createChunkedMessage } from "../../../utils";

export const TagListCmd = tagsCmd({
  trigger: ["tag list", "tags", "taglist"],
  permission: "can_list",

  async run({ message: msg, pluginData }) {
    const tags = await pluginData.state.tags.all();
    if (tags.length === 0) {
      msg.channel.createMessage(`No tags created yet! Use \`tag create\` command to create one.`);
      return;
    }

    const prefix = pluginData.config.getForMessage(msg).prefix;
    const tagNames = tags.map(tag => tag.tag).sort();

    createChunkedMessage(msg.channel, `Available tags (use with ${prefix}tag): \`\`\`${tagNames.join(", ")}\`\`\``);
  },
});
