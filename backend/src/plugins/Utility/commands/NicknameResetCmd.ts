import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn, sendSuccessMessage } from "../../../pluginUtils";
import { errorMessage } from "../../../utils";
import { utilityCmd } from "../types";

export const NicknameResetCmd = utilityCmd({
  trigger: ["nickname reset", "nick reset"],
  description: "Reset a member's nickname to their username",
  usage: "!nickname reset 106391128718245888",
  permission: "can_nickname",

  signature: {
    member: ct.resolvedMember(),
  },

  async run({ message: msg, args, pluginData }) {
    if (msg.member.id !== args.member.id && !canActOn(pluginData, msg.member, args.member)) {
      msg.channel.send(errorMessage("Cannot reset nickname: insufficient permissions"));
      return;
    }

    try {
      await args.member.edit({
        nick: "",
      });
    } catch {
      msg.channel.send(errorMessage("Failed to reset nickname"));
      return;
    }

    sendSuccessMessage(pluginData, msg.channel, `The nickname of <@!${args.member.id}> has been reset`);
  },
});
