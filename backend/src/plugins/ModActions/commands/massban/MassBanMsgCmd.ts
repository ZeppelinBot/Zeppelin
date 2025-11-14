import { waitForReply } from "vety/helpers";
import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { resolveMessageMember } from "../../../../pluginUtils.js";
import { modActionsMsgCmd } from "../../types.js";
import { actualMassBanCmd } from "./actualMassBanCmd.js";

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
    msg.reply("Ban reason? `cancel` to cancel");
    const banReasonReply = await waitForReply(pluginData.client, msg.channel, msg.author.id);

    if (!banReasonReply || !banReasonReply.content || banReasonReply.content.toLowerCase().trim() === "cancel") {
      pluginData.state.common.sendErrorMessage(msg, "Cancelled");
      return;
    }

    const authorMember = await resolveMessageMember(msg);
    actualMassBanCmd(pluginData, msg, args.userIds, authorMember, banReasonReply.content, [
      ...banReasonReply.attachments.values(),
    ]);
  },
});
