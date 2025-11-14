import { ChatInputCommandInteraction, Message } from "discord.js";
import { GuildPluginData } from "vety";
import { ModActionsPluginType } from "../../types.js";

export async function actualUnhideCaseCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  caseNumbers: number[],
) {
  const failed: number[] = [];

  for (const num of caseNumbers) {
    const theCase = await pluginData.state.cases.findByCaseNumber(num);
    if (!theCase) {
      failed.push(num);
      continue;
    }

    await pluginData.state.cases.setHidden(theCase.id, false);
  }

  if (failed.length === caseNumbers.length) {
    pluginData.state.common.sendErrorMessage(context, "None of the cases were found!");
    return;
  }

  const failedAddendum =
    failed.length > 0
      ? `\nThe following cases were not found: ${failed.toString().replace(new RegExp(",", "g"), ", ")}`
      : "";

  const amt = caseNumbers.length - failed.length;
  pluginData.state.common.sendSuccessMessage(
    context,
    `${amt} case${amt === 1 ? " is" : "s are"} no longer hidden!${failedAddendum}`,
  );
}
