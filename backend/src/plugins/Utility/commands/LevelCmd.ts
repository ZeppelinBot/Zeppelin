import { helpers } from "knub";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { utilityCmd } from "../types";

const { getMemberLevel } = helpers;

export const LevelCmd = utilityCmd({
  trigger: "level",
  description: "Show the permission level of a user",
  usage: "!level 106391128718245888",
  permission: "can_level",

  signature: {
    member: ct.resolvedMember({ required: false }),
  },

  run({ message, args, pluginData }) {
    const member = args.member || message.member;
    const level = getMemberLevel(pluginData, member);
    message.channel.send(
      `The permission level of ${member.user.username}#${member.user.discriminator} is **${level}**`,
    );
  },
});
