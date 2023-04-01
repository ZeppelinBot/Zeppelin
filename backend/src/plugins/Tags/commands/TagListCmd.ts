import escapeStringRegexp from "escape-string-regexp";
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
    const searchRegex = args.search ? new RegExp([...args.search].map((s) => escapeStringRegexp(s)).join(".*")) : null;

    const filteredTags = args.search ? tagNames.filter((tag) => searchRegex!.test(tag)) : tagNames;

    if (filteredTags.length === 0) {
      msg.channel.send("No tags matched the filter");
      return;
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

    createChunkedMessage(msg.channel, `Available tags (use with ${prefix}tag): \`\`\`${tagList}\`\`\``);
  },
});
