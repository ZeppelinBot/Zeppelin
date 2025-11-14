import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { hasPermission } from "../../../../pluginUtils.js";
import { UserNotificationMethod, resolveUser } from "../../../../utils.js";
import { readContactMethodsFromArgs } from "../../functions/readContactMethodsFromArgs.js";
import { modActionsMsgCmd } from "../../types.js";
import { actualBanCmd } from "./actualBanCmd.js";

const opts = {
  mod: ct.member({ option: true }),
  notify: ct.string({ option: true }),
  "notify-channel": ct.textChannel({ option: true }),
  "delete-days": ct.number({ option: true, shortcut: "d" }),
};

export const BanMsgCmd = modActionsMsgCmd({
  trigger: "ban",
  permission: "can_ban",
  description: "Ban or Tempban the specified member",

  signature: [
    {
      user: ct.string(),
      time: ct.delay(),
      reason: ct.string({ required: false, catchAll: true }),

      ...opts,
    },
    {
      user: ct.string(),
      reason: ct.string({ required: false, catchAll: true }),

      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user, "ModActions:BanMsgCmd");

    if (!user.id) {
      pluginData.state.common.sendErrorMessage(msg, `User not found`);
      return;
    }

    const member = msg.member || (await msg.guild.members.fetch(msg.author.id));

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = member;
    if (args.mod) {
      if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg }))) {
        pluginData.state.common.sendErrorMessage(msg, "You don't have permission to use -mod");
        return;
      }

      mod = args.mod;
    }

    let contactMethods: UserNotificationMethod[] | undefined;
    try {
      contactMethods = readContactMethodsFromArgs(args) ?? undefined;
    } catch (e) {
      pluginData.state.common.sendErrorMessage(msg, e.message);
      return;
    }

    actualBanCmd(
      pluginData,
      msg,
      user,
      args["time"] ? args["time"] : null,
      args.reason || "",
      [...msg.attachments.values()],
      member,
      mod,
      contactMethods,
      args["delete-days"] ?? undefined,
    );
  },
});
