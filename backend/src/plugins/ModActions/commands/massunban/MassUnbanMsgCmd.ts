import { waitForReply } from "knub/helpers";
import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { getContextChannel, sendContextResponse } from "../../../../pluginUtils";
import { actualMassUnbanCmd } from "./actualMassUnbanCmd";
import { modActionsMsgCmd } from "../../types";

export const MassUnbanMsgCmd = modActionsMsgCmd({
  trigger: "massunban",
  permission: "can_massunban",
  description: "Mass-unban a list of user IDs",

  signature: [
    {
      userIds: ct.string({ rest: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    // Ask for unban reason (cleaner this way instead of trying to cram it into the args)
    sendContextResponse(msg, "Unban reason? `cancel` to cancel");
    const unbanReasonReply = await waitForReply(pluginData.client, await getContextChannel(msg), msg.author.id);
    if (!unbanReasonReply || !unbanReasonReply.content || unbanReasonReply.content.toLowerCase().trim() === "cancel") {
      pluginData.state.common.sendErrorMessage(msg, "Cancelled");
      return;
    }

    actualMassUnbanCmd(pluginData, msg, args.userIds, msg.member, unbanReasonReply.content, [
      ...unbanReasonReply.attachments.values(),
    ]);
  },
});
