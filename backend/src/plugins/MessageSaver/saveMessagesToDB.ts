import { Message, Snowflake, TextChannel, ThreadChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { MessageSaverPluginType } from "./types";

export async function saveMessagesToDB(
  pluginData: GuildPluginData<MessageSaverPluginType>,
  channel: TextChannel | ThreadChannel,
  ids: string[],
) {
  const failed: string[] = [];
  for (const id of ids) {
    const savedMessage = await pluginData.state.savedMessages.find(id);
    if (savedMessage) continue;

    let thisMsg: Message;

    try {
      thisMsg = await channel.messages.fetch(id);

      if (!thisMsg) {
        failed.push(id);
        continue;
      }

      await pluginData.state.savedMessages.createFromMsg(thisMsg, { is_permanent: true });
    } catch {
      failed.push(id);
    }
  }

  return {
    savedCount: ids.length - failed.length,
    failed,
  };
}
