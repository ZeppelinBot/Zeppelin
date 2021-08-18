import { GuildChannel, Message, TextChannel, ThreadChannel } from "discord.js";
import { Queue } from "../Queue";
import { sleep } from "../utils";

const queue = new Queue();

export function hotfixMessageFetch(channel: TextChannel | ThreadChannel, messageId: string): Promise<Message> {
  return queue.add(async () => {
    await sleep(3000);
    return channel.messages.fetch(messageId);
  });
}
