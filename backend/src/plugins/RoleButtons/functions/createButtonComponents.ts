import { MessageActionRow, MessageButton, Snowflake } from "discord.js";
import { chunkArray } from "../../../utils";
import { RoleButtonsPluginType, TRoleButtonOption, TRoleButtonsConfigItem } from "../types";
import { buildCustomId } from "../../../utils/buildCustomId";
import { GuildPluginData } from "knub";
import { TooManyComponentsError } from "./TooManyComponentsError";

export function createButtonComponents(configItem: TRoleButtonsConfigItem): MessageActionRow[] {
  const rows: MessageActionRow[] = [];

  let currentRow = new MessageActionRow();
  for (const [index, option] of configItem.options.entries()) {
    if (currentRow.components.length === 5 || (currentRow.components.length > 0 && option.start_new_row)) {
      rows.push(currentRow);
      currentRow = new MessageActionRow();
    }

    const button = new MessageButton()
      .setLabel(option.label ?? "")
      .setStyle(option.style ?? "PRIMARY")
      .setCustomId(buildCustomId("roleButtons", { name: configItem.name, index }));

    if (option.emoji) {
      button.setEmoji(option.emoji);
    }

    currentRow.components.push(button);
  }

  if (currentRow.components.length > 0) {
    rows.push(currentRow);
  }

  if (rows.length > 5) {
    throw new TooManyComponentsError();
  }

  return rows;
}
