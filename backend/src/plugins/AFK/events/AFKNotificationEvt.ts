import { sendUserMentionMessage, sendWelcomeBackMessage } from "../functions/buildAFKMessages";
import { afkEvt } from "../types";

export const AFKNotificationEvt = afkEvt({
    event: 'messageCreate',

    listener: async ({ pluginData, args: { message } }) => {
        // Mention Check (if someone mentions the AFK user)
        if (message.mentions.length) {
            const mentionedMembers: Array<{ id: string, status: string }> = [];
            for (const user of message.mentions) {
              const afk = (await pluginData.state.afkUsers.getUserAFKStatus(user.id))!;
              if (afk) {
                mentionedMembers.push({
                  id: afk.user_id,
                  status: afk.status,
                });
              }
            }

            const user = mentionedMembers.length > 1
              ? mentionedMembers.map((u) => `<@!${u.id}>: **${u.status}**`)
              : mentionedMembers[0];
            await sendUserMentionMessage(message, user);

            return;
        }

        // Self AFK Check (if user is the one that's AFK)
        const user = await pluginData.state.afkUsers.getUserAFKStatus(message.author.id);
        if (!user) return;

        try {
            await pluginData.state.afkUsers.clearAFKStatus(message.author.id);
        } catch (err) {}

        await sendWelcomeBackMessage(message);
    }
});
