import escapeStringRegexp from "escape-string-regexp";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { createChunkedMessage } from "../../../utils.js";
import { tagsCmd } from "../types.js";

export const TagListCmd = tagsCmd({
  trigger: ["tag list", "tags", "taglist"],
  permission: "can_list",

  signature: {
    search: ct.string({ required: false }),
  },

  async run({ message: msg, args, pluginData }) {
    const config = await pluginData.config.getForMessage(msg);

    const searchRegex = args.search
      ? new RegExp([...args.search].map((s) => escapeStringRegexp(s)).join(".*"), "i")
      : null;

    const messageBody = (prefix = config.prefix, tagNames: string[], category?): string => {
      if (tagNames.length == 0) {
        return "";
      }

      const filteredTags = args.search ? tagNames.filter((tag) => searchRegex!.test(tag)) : tagNames;
      if (filteredTags.length === 0) {
        return "";
      }

      const tagGroups = filteredTags.reduce((obj, tag) => {
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

      return `Available ${
        category ? `\`${category}\`` : "uncategorized"
      } tags (use with ${prefix}tag): \`\`\`${tagList}\`\`\``;
    };

    const dynamicTags = (await pluginData.state.tags.all()).map((tag) => tag.tag).sort();
    const dynamicMessageBody = messageBody(config.prefix, dynamicTags);

    const messageBodies = [dynamicMessageBody];

    const tagCategories = Object.entries(config.categories);
    for (const [category, value] of tagCategories) {
      const tags = Object.keys(value.tags);
      messageBodies.push(messageBody(value.prefix ?? config.prefix, tags, category));
    }

    createChunkedMessage(msg.channel, messageBodies.filter((str) => str.length > 0).join("\n"));
  },
});
