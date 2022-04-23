import { TRoleButtonsConfigItem } from "../types";

// This function will be more complex in the future when the plugin supports select menus + sub-menus
export function getAllRolesInButtons(buttons: TRoleButtonsConfigItem): string[] {
  const roles = new Set<string>();
  for (const option of buttons.options) {
    roles.add(option.role_id);
  }
  return Array.from(roles);
}
