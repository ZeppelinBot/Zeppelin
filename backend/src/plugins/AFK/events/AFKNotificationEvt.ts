import { sendUserMentionMessage, sendWelcomeBackMessage } from "../functions/buildAFKMessages";
import { afkEvt } from "../types";

export const AFKNotificationEvt = afkEvt({
  event: "messageCreate",

  listener: async ({ pluginData, args: { message } }) => {
    // Mention Check (if someone mentions the AFK user)
    if (message.mentions.length) {
      const afk = await pluginData.state.afkUsers.getUserAFKStatus(message.mentions[0].id);
      if (!afk) return;

      sendUserMentionMessage(message, afk.status);

      return;
    }

    // Self AFK Check (if user is the one that's AFK)
    const afk = await pluginData.state.afkUsers.getUserAFKStatus(message.author.id);
    if (!afk) return;

    try {
      await pluginData.state.afkUsers.clearAFKStatus(message.author.id);
    } catch (err) {}

    sendWelcomeBackMessage(message);
  },
});
