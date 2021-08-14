import { commandTypeHelpers as ct } from "../../../commandTypes";
import { locateUserCmd } from "../types";
import { sendWhere } from "../utils/sendWhere";

export const WhereCmd = locateUserCmd({
  trigger: ["where", "w"],
  description: "Posts an instant invite to the voice channel that `<member>` is in",
  usage: "!w 108552944961454080",
  permission: "can_where",

  signature: {
    member: ct.resolvedMember(),
  },

  async run({ message: msg, args, pluginData }) {
    sendWhere(pluginData, args.member, msg.channel, `<@${msg.member.id}> | `);
  },
});
