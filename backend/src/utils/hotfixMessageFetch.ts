import { GuildChannel, Message, TextChannel, ThreadChannel } from "discord.js";
import { Queue } from "../Queue";
import { sleep } from "../utils";

const queue = new Queue();
let n = 0;

export function hotfixMessageFetch(channel: TextChannel | ThreadChannel, messageId: string): Promise<Message> {
  const thisN = ++n;

  // tslint:disable-next-line:no-console
  console.trace(
    `[${thisN}] Queueing to fetch message id ${messageId} from channel ${channel.id} (queue size: ${queue.length})`,
  );
  return queue.add(async () => {
    await sleep(3000);
    // tslint:disable-next-line:no-console
    console.log(`[${thisN}] Fetching message id ${messageId} from channel ${channel.id}`);
    return channel.messages.fetch(messageId);
  });
}
