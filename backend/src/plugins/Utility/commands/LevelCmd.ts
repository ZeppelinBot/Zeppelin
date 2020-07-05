import { utilityCmd } from "../types";
import { customArgumentHelpers as ct } from "../../../customArgumentTypes";
import { helpers } from "knub";

const { getMemberLevel } = helpers;

export const LevelCmd = utilityCmd(
  "level",
  {
    member: ct.resolvedMember({ required: false }),
  },

  {
    description: "Show the permission level of a user",
    usage: "!level 106391128718245888",
  },

  ({ message, args, pluginData }) => {
    const member = args.member || message.member;
    const level = getMemberLevel(pluginData, member);
    message.channel.createMessage(`The permission level of ${member.username}#${member.discriminator} is **${level}**`);
  }
);
