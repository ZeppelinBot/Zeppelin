import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { canActOn } from "../../../pluginUtils.js";
import { errorMessage } from "../../../utils.js";
import { utilityCmd } from "../types.js";

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

    if (!args.member.nickname) {
      msg.channel.send(errorMessage("User does not have a nickname"));
      return;
    }

    try {
      await args.member.setNickname(null);
    } catch {
      msg.channel.send(errorMessage("Failed to reset nickname"));
      return;
    }

    void pluginData.state.common.sendSuccessMessage(msg, `The nickname of <@!${args.member.id}> has been reset`);
  },
});
