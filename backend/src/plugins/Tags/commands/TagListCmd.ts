import { commandTypeHelpers as ct } from "../../../commandTypes";
import { createChunkedMessage } from "../../../utils";
import { tagsCmd } from "../types";

export const TagListCmd = tagsCmd({
  trigger: ["tag list", "tags", "taglist"],
  permission: "can_list",

  signature: {
    search: ct.string({ required: false }),
  },

  async run({ message: msg, args, pluginData }) {
    const tags = await pluginData.state.tags.all();
    if (tags.length === 0) {
      msg.channel.send(`No tags created yet! Use \`tag create\` command to create one.`);
      return;
    }

    const prefix = (await pluginData.config.getForMessage(msg)).prefix;
    const tagNames = tags.map((tag) => tag.tag).sort();

    const filteredTags = args.search
      ? tagNames.filter((tag) =>
          new RegExp(
            args.search
              .split("")
              .map((char) => char.replace(/[.*+?^${}()|[\]\\]/, "\\$&"))
              .join(".*")
          ).test(tag)
        )
      : tagNames;

    const tagGroups = filteredTags.reduce((acc, tag) => {
      const obj = { ...acc };
      const tagUpper = tag.toUpperCase();
      const key = /[A-Z]/.test(tagUpper[0]) ? tagUpper[0] : "#";
      if (!(key in obj)) {
        obj[key] = [];
      }
      obj[key].push(tag);
      return obj;
    }, {});

    const tagList = Object.keys(tagGroups)
      .sort()
      .map((key) => `[${key}] ${tagGroups[key].join(", ")}`)
      .join("\n");

    createChunkedMessage(msg.channel, `Available tags (use with ${prefix}tag): \`\`\`${tagList}\`\`\``);
  },
});
