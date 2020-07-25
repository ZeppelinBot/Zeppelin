import { Message } from "eris";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { disableBotSlowmodeForChannel } from "./disableBotSlowmodeForChannel";
import { noop } from "src/utils";

export async function actualDisableSlowmodeCmd(msg: Message, args, pluginData) {
  const botSlowmode = await pluginData.state.slowmodes.getChannelSlowmode(args.channel.id);
  const hasNativeSlowmode = args.channel.rateLimitPerUser;

  if (!botSlowmode && hasNativeSlowmode === 0) {
    sendErrorMessage(pluginData, msg.channel, "Channel is not on slowmode!");
    return;
  }

  const initMsg = await msg.channel.createMessage("Disabling slowmode...");

  // Disable bot-maintained slowmode
  let failedUsers = [];
  if (botSlowmode) {
    const result = await disableBotSlowmodeForChannel(pluginData, args.channel);
    failedUsers = result.failedUsers;
  }

  // Disable native slowmode
  if (hasNativeSlowmode) {
    await args.channel.edit({ rateLimitPerUser: 0 });
  }

  if (failedUsers.length) {
    sendSuccessMessage(
      pluginData,
      msg.channel,
      `Slowmode disabled! Failed to clear slowmode from the following users:\n\n<@!${failedUsers.join(">\n<@!")}>`,
    );
  } else {
    sendSuccessMessage(pluginData, msg.channel, "Slowmode disabled!");
    initMsg.delete().catch(noop);
  }
}
