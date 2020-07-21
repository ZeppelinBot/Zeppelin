import { usernameEvent } from "../types";
import { updateUsername } from "../updateUsername";

export const MessageCreateEvt = usernameEvent({
  event: "messageCreate",

  async listener(meta) {
    if (meta.args.message.author.bot) return;
    meta.pluginData.state.updateQueue.add(() => updateUsername(meta.pluginData, meta.args.message.author));
  },
});
