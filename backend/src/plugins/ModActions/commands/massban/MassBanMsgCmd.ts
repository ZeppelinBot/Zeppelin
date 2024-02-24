import { waitForReply } from "knub/helpers";
import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { getContextChannel, sendContextResponse } from "../../../../pluginUtils";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { actualMassBanCmd } from "../../functions/actualCommands/actualMassBanCmd";
import { modActionsMsgCmd } from "../../types";

export const MassBanMsgCmd = modActionsMsgCmd({
  trigger: "massban",
  permission: "can_massban",
  description: "Mass-ban a list of user IDs",

  signature: [
    {
      userIds: ct.string({ rest: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    // Ask for ban reason (cleaner this way instead of trying to cram it into the args)
    sendContextResponse(msg, "Ban reason? `cancel` to cancel");
    const banReasonReply = await waitForReply(pluginData.client, await getContextChannel(msg), msg.author.id);

    if (!banReasonReply || !banReasonReply.content || banReasonReply.content.toLowerCase().trim() === "cancel") {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Cancelled");
      return;
    }

    actualMassBanCmd(pluginData, msg, args.userIds, msg.member, banReasonReply.content, [
      ...banReasonReply.attachments.values(),
    ]);
  },
});
