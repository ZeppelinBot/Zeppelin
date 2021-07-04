import { Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { ReactionRolesPluginType } from "../types";
import { ButtonMenuActions } from "./buttonMenuActions";

export const BUTTON_CONTEXT_SEPARATOR = "::";

export async function getButtonAction(pluginData: GuildPluginData<ReactionRolesPluginType>, roleOrMenu: string) {
  if (await pluginData.guild.roles.fetch(roleOrMenu as Snowflake).catch(() => false)) {
    return ButtonMenuActions.MODIFY_ROLE;
  } else {
    return ButtonMenuActions.OPEN_MENU;
  }
}

export async function generateStatelessCustomId(
  pluginData: GuildPluginData<ReactionRolesPluginType>,
  groupName: string,
  roleOrMenu: string,
) {
  let id = groupName + BUTTON_CONTEXT_SEPARATOR;

  id += `${await getButtonAction(pluginData, roleOrMenu)}${BUTTON_CONTEXT_SEPARATOR}${roleOrMenu}`;

  return id;
}

export async function resolveStatefulCustomId(pluginData: GuildPluginData<ReactionRolesPluginType>, id: string) {
  const button = await pluginData.state.buttonRoles.getForButtonId(id);

  if (button) {
    const group = pluginData.config.get().button_groups[button.button_group];
    const cfgButton = group.default_buttons[button.button_name];

    return {
      groupName: button.button_group,
      action: await getButtonAction(pluginData, cfgButton.role_or_menu),
      roleOrMenu: cfgButton.role_or_menu,
      stateless: false,
    };
  } else {
    return null;
  }
}
