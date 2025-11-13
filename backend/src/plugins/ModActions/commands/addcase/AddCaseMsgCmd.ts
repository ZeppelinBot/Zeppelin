import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { CaseTypes } from "../../../../data/CaseTypes.js";
import { hasPermission } from "../../../../pluginUtils.js";
import { resolveUser } from "../../../../utils.js";
import { modActionsMsgCmd } from "../../types.js";
import { actualAddCaseCmd } from "./actualAddCaseCmd.js";

const opts = {
  mod: ct.member({ option: true }),
};

export const AddCaseMsgCmd = modActionsMsgCmd({
  trigger: "addcase",
  permission: "can_addcase",
  description: "Add an arbitrary case to the specified user without taking any action",

  signature: [
    {
      type: ct.string(),
      user: ct.string(),
      reason: ct.string({ required: false, catchAll: true }),

      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user, "ModActions:AddCaseCmd");
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

    // Verify the case type is valid
    const type: string = args.type[0].toUpperCase() + args.type.slice(1).toLowerCase();
    if (!CaseTypes[type]) {
      pluginData.state.common.sendErrorMessage(msg, "Cannot add case: invalid case type");
      return;
    }

    actualAddCaseCmd(
      pluginData,
      msg,
      member,
      mod,
      [...msg.attachments.values()],
      user,
      type as keyof CaseTypes,
      args.reason || "",
    );
  },
});
