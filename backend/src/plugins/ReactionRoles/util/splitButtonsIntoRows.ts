import { MessageActionRow, MessageButton } from "discord.js";
import { TButtonOpts } from "../types";

export function splitButtonsIntoRows(actualButtons: MessageButton[], configButtons: TButtonOpts[]): MessageActionRow[] {
  const rows: MessageActionRow[] = [];
  let curRow = new MessageActionRow();
  let consecutive = 0;

  for (let i = 0; i < actualButtons.length; i++) {
    const aBtn = actualButtons[i];
    const cBtn = configButtons[i];

    curRow.addComponents(aBtn);
    if (((consecutive + 1) % 5 === 0 || cBtn.end_row) && i + 1 < actualButtons.length) {
      rows.push(curRow);
      curRow = new MessageActionRow();
      consecutive = 0;
    } else {
      consecutive++;
    }
  }

  if (curRow.components.length >= 1) rows.push(curRow);
  return rows;
}

export function getRowCount(configButtons: TButtonOpts[]): number {
  let count = 1;
  let consecutive = 0;
  for (let i = 0; i < configButtons.length; i++) {
    const cBtn = configButtons[i];

    if (((consecutive + 1) % 5 === 0 || cBtn.end_row) && i + 1 < configButtons.length) {
      count++;
      consecutive = 0;
    } else {
      consecutive++;
    }
  }

  return count;
}
