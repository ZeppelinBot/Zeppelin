import { MessageSaverPluginType } from "./types";
import { PluginData } from "knub";
import { Message, TextChannel } from "eris";

export async function saveMessagesToDB(
  pluginData: PluginData<MessageSaverPluginType>,
  channel: TextChannel,
  ids: string[],
) {
  const failed = [];
  for (const id of ids) {
    const savedMessage = await pluginData.state.savedMessages.find(id);
    if (savedMessage) continue;

    let thisMsg: Message;

    try {
      thisMsg = await channel.getMessage(id);

      if (!thisMsg) {
        failed.push(id);
        continue;
      }

      await pluginData.state.savedMessages.createFromMsg(thisMsg, { is_permanent: true });
    } catch (e) {
      failed.push(id);
    }
  }

  return {
    savedCount: ids.length - failed.length,
    failed,
  };
}
