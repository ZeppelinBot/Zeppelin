import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn, sendSuccessMessage } from "../../../pluginUtils";
import { errorMessage } from "../../../utils";
import { utilityCmd } from "../types";

export const NicknameCmd = utilityCmd({
  trigger: ["nickname", "nick"],
  description: "Set a member's nickname",
  usage: "!nickname 106391128718245888 Drag",
  permission: "can_nickname",

  signature: {
    member: ct.resolvedMember(),
    nickname: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    if (msg.member.id !== args.member.id && !canActOn(pluginData, msg.member, args.member)) {
      msg.channel.send(errorMessage("Cannot change nickname: insufficient permissions"));
      return;
    }

    const nicknameLength = [...args.nickname].length;
    if (nicknameLength < 2 || nicknameLength > 32) {
      msg.channel.send(errorMessage("Nickname must be between 2 and 32 characters long"));
      return;
    }

    const oldNickname = args.member.nickname || "<none>";

    try {
      await args.member.edit({
        nick: args.nickname,
      });
    } catch {
      msg.channel.send(errorMessage("Failed to change nickname"));
      return;
    }

    sendSuccessMessage(
      pluginData,
      msg.channel,
      `Changed nickname of <@!${args.member.id}> from **${oldNickname}** to **${args.nickname}**`,
    );
  },
});
