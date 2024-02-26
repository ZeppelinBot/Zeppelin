import { commandTypeHelpers as ct } from "../../../commandTypes";
import { isGuildInvite, resolveInvite } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { isEligible } from "../functions/isEligible";
import { botControlCmd } from "../types";

export const EligibleCmd = botControlCmd({
  trigger: ["eligible", "is_eligible", "iseligible"],
  permission: "can_eligible",

  signature: {
    user: ct.resolvedUser(),
    inviteCode: ct.string(),
  },

  async run({ pluginData, message: msg, args }) {
    const invite = await resolveInvite(pluginData.client, args.inviteCode, true);
    if (!invite || !isGuildInvite(invite)) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Could not resolve invite");
      return;
    }

    const { result, explanation } = await isEligible(pluginData, args.user, invite);

    if (result) {
      pluginData.getPlugin(CommonPlugin).sendSuccessMessage(msg, `Server is eligible: ${explanation}`);
      return;
    }

    pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, `Server is **NOT** eligible: ${explanation}`);
  },
});
