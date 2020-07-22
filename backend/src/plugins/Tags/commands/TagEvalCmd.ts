import { tagsCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { renderTag } from "../util/renderTag";

export const TagEvalCmd = tagsCmd({
  trigger: "tag eval",
  permission: "can_create",

  signature: {
    body: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const rendered = await renderTag(pluginData, args.body);
    msg.channel.createMessage(rendered);
  },
});
