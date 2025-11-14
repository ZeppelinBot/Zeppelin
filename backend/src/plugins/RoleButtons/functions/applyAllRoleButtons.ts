import { createHash } from "crypto";
import { GuildPluginData } from "vety";
import { RoleButtonsPluginType } from "../types.js";
import { applyRoleButtons } from "./applyRoleButtons.js";

export async function applyAllRoleButtons(pluginData: GuildPluginData<RoleButtonsPluginType>) {
  const savedRoleButtons = await pluginData.state.roleButtons.getSavedRoleButtons();
  const config = pluginData.config.get();
  for (const [configName, configItem] of Object.entries(config.buttons)) {
    // Use the hash of the config to quickly check if we need to update buttons
    const configItemToHash = { ...configItem, name: configName }; // Add name property for backwards compatibility
    const hash = createHash("md5").update(JSON.stringify(configItemToHash)).digest("hex");
    const savedButtonsItem = savedRoleButtons.find((bt) => bt.name === configName);
    if (savedButtonsItem?.hash === hash) {
      // No changes
      continue;
    }

    if (savedButtonsItem) {
      await pluginData.state.roleButtons.deleteRoleButtonItem(configName);
    }

    const applyResult = await applyRoleButtons(pluginData, configItem, configName, savedButtonsItem ?? null);
    if (!applyResult) {
      return;
    }

    await pluginData.state.roleButtons.saveRoleButtonItem(
      configName,
      applyResult.channel_id,
      applyResult.message_id,
      hash,
    );
  }

  // Remove saved role buttons from the DB that are no longer in the config
  const savedRoleButtonsToDelete = savedRoleButtons
    .filter((savedRoleButton) => !config.buttons[savedRoleButton.name])
    .map((savedRoleButton) => savedRoleButton.name);
  for (const name of savedRoleButtonsToDelete) {
    await pluginData.state.roleButtons.deleteRoleButtonItem(name);
  }
}
