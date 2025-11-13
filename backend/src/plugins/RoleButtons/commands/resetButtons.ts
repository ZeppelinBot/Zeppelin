import { guildPluginMessageCommand } from "vety";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { applyAllRoleButtons } from "../functions/applyAllRoleButtons.js";
import { RoleButtonsPluginType } from "../types.js";

export const resetButtonsCmd = guildPluginMessageCommand<RoleButtonsPluginType>()({
  trigger: "role_buttons reset",
  description:
    "In case of issues, you can run this command to have Zeppelin 'forget' about specific role buttons and re-apply them. This will also repost the message, if not targeting an existing message.",
  usage: "!role_buttons reset my_roles",
  permission: "can_reset",
  signature: {
    name: ct.string(),
  },
  async run({ pluginData, args, message }) {
    const config = pluginData.config.get();
    if (!config.buttons[args.name]) {
      void pluginData.state.common.sendErrorMessage(message, `Can't find role buttons with the name "${args.name}"`);
      return;
    }

    await pluginData.state.roleButtons.deleteRoleButtonItem(args.name);
    await applyAllRoleButtons(pluginData);
    void pluginData.state.common.sendSuccessMessage(message, "Done!");
  },
});
