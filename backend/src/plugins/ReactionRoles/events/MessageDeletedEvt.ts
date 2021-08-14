import { reactionRolesEvt } from "../types";

export const MessageDeletedEvt = reactionRolesEvt({
  event: "messageDelete",
  allowBots: true,
  allowSelf: true,

  async listener(meta) {
    const pluginData = meta.pluginData;

    await pluginData.state.buttonRoles.removeAllForMessageId(meta.args.message.id);
    await pluginData.state.reactionRoles.removeFromMessage(meta.args.message.id);
  },
});
