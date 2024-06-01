import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils.js";
import { tagsCmd } from "../types.js";

export const TagDeleteCmd = tagsCmd({
  trigger: "tag delete",
  permission: "can_create",

  signature: {
    tag: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    const tag = await pluginData.state.tags.find(args.tag);
    if (!tag) {
      sendErrorMessage(pluginData, msg.channel, "No tag with that name");
      return;
    }

    await pluginData.state.tags.delete(args.tag);
    sendSuccessMessage(pluginData, msg.channel, "Tag deleted!");
  },
});
