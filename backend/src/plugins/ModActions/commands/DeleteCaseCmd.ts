import { TextChannel } from "discord.js";
import { helpers } from "knub";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { Case } from "../../../data/entities/Case";
import { LogType } from "../../../data/LogType";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { SECONDS, stripObjectToScalars, trimLines } from "../../../utils";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { modActionsCmd } from "../types";

export const DeleteCaseCmd = modActionsCmd({
  trigger: ["delete_case", "deletecase"],
  permission: "can_deletecase",
  description: trimLines(`
    Delete the specified case. This operation can *not* be reversed.
    It is generally recommended to use \`!hidecase\` instead when possible.
  `),

  signature: {
    caseNumber: ct.number({ rest: true }),

    force: ct.switchOption({ def: false, shortcut: "f" }),
  },

  async run({ pluginData, message, args }) {
    const failed: number[] = [];
    const validCases: Case[] = [];
    let cancelled = 0;

    for (const num of args.caseNumber) {
      const theCase = await pluginData.state.cases.findByCaseNumber(num);
      if (!theCase) {
        failed.push(num);
        continue;
      }

      validCases.push(theCase);
    }

    if (failed.length === args.caseNumber.length) {
      sendErrorMessage(pluginData, message.channel, "None of the cases were found!");
      return;
    }

    for (const theCase of validCases) {
      if (!args.force) {
        const cases = pluginData.getPlugin(CasesPlugin);
        const embedContent = await cases.getCaseEmbed(theCase);
        message.channel.send({
          ...embedContent,
          content: "Delete the following case? Answer 'Yes' to continue, 'No' to cancel.",
        });

        const reply = await helpers.waitForReply(
          pluginData.client,
          message.channel as TextChannel,
          message.author.id,
          15 * SECONDS,
        );
        const normalizedReply = (reply?.content || "").toLowerCase().trim();
        if (normalizedReply !== "yes" && normalizedReply !== "y") {
          message.channel.send("Cancelled. Case was not deleted.");
          cancelled++;
          continue;
        }
      }

      const deletedByName = `${message.author.username}#${message.author.discriminator}`;

      const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);
      const deletedAt = timeAndDate.inGuildTz().format(timeAndDate.getDateFormat("pretty_datetime"));

      await pluginData.state.cases.softDelete(
        theCase.id,
        message.author.id,
        deletedByName,
        `Case deleted by **${deletedByName}** (\`${message.author.id}\`) on ${deletedAt}`,
      );

      const logs = pluginData.getPlugin(LogsPlugin);
      logs.log(LogType.CASE_DELETE, {
        mod: stripObjectToScalars(message.member, ["user", "roles"]),
        case: stripObjectToScalars(theCase),
      });
    }

    const failedAddendum =
      failed.length > 0
        ? `\nThe following cases were not found: ${failed.toString().replace(new RegExp(",", "g"), ", ")}`
        : "";
    const amt = validCases.length - cancelled;
    if (amt === 0) {
      sendErrorMessage(pluginData, message.channel, "All deletions were cancelled, no cases were deleted.");
      return;
    }

    sendSuccessMessage(
      pluginData,
      message.channel,
      `${amt} case${amt === 1 ? " was" : "s were"} deleted!${failedAddendum}`,
    );
  },
});
