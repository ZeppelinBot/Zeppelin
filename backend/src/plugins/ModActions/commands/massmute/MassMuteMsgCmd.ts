import { waitForReply } from "knub/helpers";
import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { getContextChannel, sendContextResponse } from "../../../../pluginUtils";
import { actualMassMuteCmd } from "./actualMassMuteCmd";
import { modActionsMsgCmd } from "../../types";

export const MassMuteMsgCmd = modActionsMsgCmd({
  trigger: "massmute",
  permission: "can_massmute",
  description: "Mass-mute a list of user IDs",

  signature: [
    {
      userIds: ct.string({ rest: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    // Ask for mute reason
    sendContextResponse(msg, "Mute reason? `cancel` to cancel");
    const muteReasonReceived = await waitForReply(pluginData.client, await getContextChannel(msg), msg.author.id);
    if (
      !muteReasonReceived ||
      !muteReasonReceived.content ||
      muteReasonReceived.content.toLowerCase().trim() === "cancel"
    ) {
      pluginData.state.common.sendErrorMessage(msg, "Cancelled");
      return;
    }

    actualMassMuteCmd(pluginData, msg, args.userIds, msg.member, muteReasonReceived.content, [
      ...muteReasonReceived.attachments.values(),
    ]);
  },
});
