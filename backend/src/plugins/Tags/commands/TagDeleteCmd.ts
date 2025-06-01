import { commandTypeHelpers as ct } from "../../../commandTypes.js";
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
      void pluginData.state.common.sendErrorMessage(msg, "No tag with that name");
      return;
    }

    await pluginData.state.tags.delete(args.tag);
    void pluginData.state.common.sendSuccessMessage(msg, "Tag deleted!");
  },
});
