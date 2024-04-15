import { ChatInputCommandInteraction, GuildMember, Message } from "discord.js";
import { GuildPluginData, helpers } from "knub";
import { Case } from "../../../../data/entities/Case";
import { getContextChannel, sendContextResponse } from "../../../../pluginUtils";
import { SECONDS, renderUsername } from "../../../../utils";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { LogsPlugin } from "../../../Logs/LogsPlugin";
import { TimeAndDatePlugin } from "../../../TimeAndDate/TimeAndDatePlugin";
import { ModActionsPluginType } from "../../types";

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
      const cases = pluginData.getPlugin(CasesPlugin);
      const embedContent = await cases.getCaseEmbed(theCase);
      sendContextResponse(context, {
        ...embedContent,
        content: "Delete the following case? Answer 'Yes' to continue, 'No' to cancel.",
      });

      const reply = await helpers.waitForReply(
        pluginData.client,
        await getContextChannel(context),
        author.id,
        15 * SECONDS,
      );
      const normalizedReply = (reply?.content || "").toLowerCase().trim();
      if (normalizedReply !== "yes" && normalizedReply !== "y") {
        sendContextResponse(context, "Cancelled. Case was not deleted.");
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
    pluginData.state.common.sendErrorMessage(
      context,
      "All deletions were cancelled, no cases were deleted."
    );
    return;
  }

  pluginData.state.common.sendSuccessMessage(
    context,
    `${amt} case${amt === 1 ? " was" : "s were"} deleted!${failedAddendum}`
  );
}
