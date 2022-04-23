import { GuildPluginData } from "knub";
import { RoleButtonsPluginType } from "../types";
import { createHash } from "crypto";
import { applyRoleButtons } from "./applyRoleButtons";

export async function applyAllRoleButtons(pluginData: GuildPluginData<RoleButtonsPluginType>) {
  const savedRoleButtons = await pluginData.state.roleButtons.getSavedRoleButtons();
  const config = pluginData.config.get();
  for (const buttons of Object.values(config.buttons)) {
    // Use the hash of the config to quickly check if we need to update buttons
    const hash = createHash("md5").update(JSON.stringify(buttons)).digest("hex");
    const savedButtonsItem = savedRoleButtons.find((bt) => bt.name === buttons.name);
    if (savedButtonsItem?.hash === hash) {
      // No changes
      continue;
    }

    if (savedButtonsItem) {
      await pluginData.state.roleButtons.deleteRoleButtonItem(buttons.name);
    }

    const applyResult = await applyRoleButtons(pluginData, buttons, savedButtonsItem ?? null);
    if (!applyResult) {
      return;
    }

    await pluginData.state.roleButtons.saveRoleButtonItem(
      buttons.name,
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
