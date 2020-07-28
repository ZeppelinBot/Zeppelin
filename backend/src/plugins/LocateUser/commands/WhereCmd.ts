import { locateUserCommand } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { resolveMember } from "src/utils";
import { sendWhere } from "../utils/sendWhere";

export const WhereCmd = locateUserCommand({
  trigger: ["where", "w"],
  description: "Posts an instant invite to the voice channel that `<member>` is in",
  usage: "!w 108552944961454080",
  permission: "can_where",

  signature: {
    member: ct.resolvedMember(),
  },

  async run({ message: msg, args, pluginData }) {
    const member = await resolveMember(pluginData.client, pluginData.guild, args.member.id);
    sendWhere(pluginData, member, msg.channel, `${msg.member.mention} | `);
  },
});
