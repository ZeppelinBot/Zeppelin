import { modActionsCommand } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { helpers } from "knub";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { TextChannel } from "eris";
import { SECONDS, stripObjectToScalars, trimLines } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { LogType } from "../../../data/LogType";
import moment from "moment-timezone";

export const DeleteCaseCmd = modActionsCommand({
  trigger: ["delete_case", "deletecase"],
  permission: "can_deletecase",
  description: trimLines(`
    Delete the specified case. This operation can *not* be reversed.
    It is generally recommended to use \`!hidecase\` instead when possible.
  `),

  signature: {
    caseNumber: ct.number(),

    force: ct.switchOption({ shortcut: "f" }),
  },

  async run({ pluginData, message, args }) {
    const theCase = await pluginData.state.cases.findByCaseNumber(args.caseNumber);
    if (!theCase) {
      sendErrorMessage(pluginData, message.channel, "Case not found");
      return;
    }

    if (!args.force) {
      const cases = pluginData.getPlugin(CasesPlugin);
      const embedContent = await cases.getCaseEmbed(theCase);
      message.channel.createMessage({
        content: "Delete the following case? Answer 'Yes' to continue, 'No' to cancel.",
        embed: embedContent.embed,
      });

      const reply = await helpers.waitForReply(
        pluginData.client,
        message.channel as TextChannel,
        message.author.id,
        15 * SECONDS,
      );
      const normalizedReply = (reply?.content || "").toLowerCase().trim();
      if (normalizedReply !== "yes" && normalizedReply !== "y") {
        message.channel.createMessage("Cancelled. Case was not deleted.");
        return;
      }
    }

    const deletedByName = `${message.author.username}#${message.author.discriminator}`;
    const deletedAt = moment().format(`MMM D, YYYY [at] H:mm [UTC]`);

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

    sendSuccessMessage(pluginData, message.channel, `Case #${theCase.case_number} deleted!`);
  },
});
