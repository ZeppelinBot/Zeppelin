import { GuildChannel, Message, TextChannel, ThreadChannel } from "discord.js";
import { Queue } from "../Queue";
import { sleep } from "../utils";

const queue = new Queue();

export function hotfixMessageFetch(channel: TextChannel | ThreadChannel, messageId: string): Promise<Message> {
  return queue.add(async () => {
    await sleep(3000);
    // tslint:disable-next-line:no-console
    console.trace(`Fetching message id ${messageId} from channel ${channel.id}`);
    return channel.messages.fetch(messageId);
  });
}
