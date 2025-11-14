import { waitForReply } from "vety/helpers";
import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { resolveMessageMember } from "../../../../pluginUtils.js";
import { modActionsMsgCmd } from "../../types.js";
import { actualMassUnbanCmd } from "./actualMassUnbanCmd.js";

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
    msg.reply("Unban reason? `cancel` to cancel");
    const unbanReasonReply = await waitForReply(pluginData.client, msg.channel, msg.author.id);
    if (!unbanReasonReply || !unbanReasonReply.content || unbanReasonReply.content.toLowerCase().trim() === "cancel") {
      pluginData.state.common.sendErrorMessage(msg, "Cancelled");
      return;
    }

    const member = await resolveMessageMember(msg);
    actualMassUnbanCmd(pluginData, msg, args.userIds, member, unbanReasonReply.content, [
      ...unbanReasonReply.attachments.values(),
    ]);
  },
});
