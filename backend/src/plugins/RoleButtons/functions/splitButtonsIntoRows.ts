import { MessageActionRow, MessageButton } from "discord.js";
import { chunkArray } from "../../../utils";

export function splitButtonsIntoRows(buttons: MessageButton[]): MessageActionRow[] {
  // Max 5 buttons per row
  const buttonChunks = chunkArray(buttons, 5);
  return buttonChunks.map((chunk) => {
    const row = new MessageActionRow();
    row.setComponents(chunk);
    return row;
  });
}
