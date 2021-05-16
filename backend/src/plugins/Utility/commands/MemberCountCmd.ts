import { utilityCmd } from "../types";

export const MemberCountCmd = utilityCmd({
  trigger: "membercount",
  description: "Show the amount of members in the server",
  usage: "!membercount",
  permission: "can_membercount",

  async run({ message: msg, pluginData }) {
    const memberCount = pluginData.guild.memberCount.toLocaleString();
    msg.channel.createMessage(`This server has **${memberCount} members**`);
  },
});
