import { typedGuildCommand } from "knub";
import { RoleButtonsPluginType } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { applyAllRoleButtons } from "../functions/applyAllRoleButtons";

export const resetButtonsCmd = typedGuildCommand<RoleButtonsPluginType>()({
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
      sendErrorMessage(pluginData, message.channel, `Can't find role buttons with the name "${args.name}"`);
      return;
    }

    await pluginData.state.roleButtons.deleteRoleButtonItem(args.name);
    await applyAllRoleButtons(pluginData);
    sendSuccessMessage(pluginData, message.channel, "Done!");
  },
});
