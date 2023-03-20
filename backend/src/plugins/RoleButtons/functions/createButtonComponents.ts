import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { buildCustomId } from "../../../utils/buildCustomId";
import { TRoleButtonsConfigItem } from "../types";
import { convertButtonStyleStringToEnum } from "./convertButtonStyleStringToEnum.js";
import { TooManyComponentsError } from "./TooManyComponentsError";

export function createButtonComponents(configItem: TRoleButtonsConfigItem): Array<ActionRowBuilder<ButtonBuilder>> {
  const rows: Array<ActionRowBuilder<ButtonBuilder>> = [];

  let currentRow = new ActionRowBuilder<ButtonBuilder>();
  for (const [index, option] of configItem.options.entries()) {
    if (currentRow.components.length === 5 || (currentRow.components.length > 0 && option.start_new_row)) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
    }

    const button = new ButtonBuilder()
      .setLabel(option.label ?? "")
      .setStyle(convertButtonStyleStringToEnum(option.style) ?? ButtonStyle.Primary)
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
