import { createChunkedMessage } from "../../../utils";
import { tagsCmd } from "../types";

export const TagListCmd = tagsCmd({
  trigger: ["tag list", "tags", "taglist"],
  permission: "can_list",

  async run({ message: msg, pluginData }) {
    const tags = await pluginData.state.tags.all();
    if (tags.length === 0) {
      msg.channel.send(`No tags created yet! Use \`tag create\` command to create one.`);
      return;
    }

    const prefix = (await pluginData.config.getForMessage(msg)).prefix;
    const tagNames = tags.map(tag => tag.tag).sort();

    createChunkedMessage(msg.channel, `Available tags (use with ${prefix}tag): \`\`\`${tagNames.join(", ")}\`\`\``);
  },
});
