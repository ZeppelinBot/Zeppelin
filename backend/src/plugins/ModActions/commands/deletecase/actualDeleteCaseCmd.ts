import { ChatInputCommandInteraction, GuildMember, Message } from "discord.js";
import { GuildPluginData } from "vety";
import { Case } from "../../../../data/entities/Case.js";
import { getContextChannel } from "../../../../pluginUtils.js";
import { confirm, renderUsername } from "../../../../utils.js";
import { CasesPlugin } from "../../../Cases/CasesPlugin.js";
import { LogsPlugin } from "../../../Logs/LogsPlugin.js";
import { TimeAndDatePlugin } from "../../../TimeAndDate/TimeAndDatePlugin.js";
import { ModActionsPluginType } from "../../types.js";

export async function actualDeleteCaseCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  author: GuildMember,
  caseNumbers: number[],
  force: boolean,
) {
  const failed: number[] = [];
  const validCases: Case[] = [];
  let cancelled = 0;

  for (const num of caseNumbers) {
    const theCase = await pluginData.state.cases.findByCaseNumber(num);
    if (!theCase) {
      failed.push(num);
      continue;
    }

    validCases.push(theCase);
  }

  if (failed.length === caseNumbers.length) {
    pluginData.state.common.sendErrorMessage(context, "None of the cases were found!");
    return;
  }

  for (const theCase of validCases) {
    if (!force) {
      const channel = await getContextChannel(context);
      if (!channel) {
        return;
      }

      const cases = pluginData.getPlugin(CasesPlugin);
      const embedContent = await cases.getCaseEmbed(theCase);

      const confirmed = await confirm(context, author.id, {
        ...embedContent,
        content: "Delete the following case?",
      });

      if (!confirmed) {
        cancelled++;
        continue;
      }
    }

    const deletedByName = renderUsername(author);

    const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);
    const deletedAt = timeAndDate.inGuildTz().format(timeAndDate.getDateFormat("pretty_datetime"));

    await pluginData.state.cases.softDelete(
      theCase.id,
      author.id,
      deletedByName,
      `Case deleted by **${deletedByName}** (\`${author.id}\`) on ${deletedAt}`,
    );

    const logs = pluginData.getPlugin(LogsPlugin);
    logs.logCaseDelete({
      mod: author,
      case: theCase,
    });
  }

  const failedAddendum =
    failed.length > 0
      ? `\nThe following cases were not found: ${failed.toString().replace(new RegExp(",", "g"), ", ")}`
      : "";
  const amt = validCases.length - cancelled;
  if (amt === 0) {
    pluginData.state.common.sendErrorMessage(context, "All deletions were cancelled, no cases were deleted.");
    return;
  }

  pluginData.state.common.sendSuccessMessage(
    context,
    `${amt} case${amt === 1 ? " was" : "s were"} deleted!${failedAddendum}`,
  );
}
