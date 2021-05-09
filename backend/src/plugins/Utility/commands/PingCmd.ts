import { utilityCmd } from "../types";
import { noop, trimLines } from "../../../utils";
import { Message } from "eris";

const { performance } = require("perf_hooks");

export const PingCmd = utilityCmd({
  trigger: ["ping", "pong"],
  description: "Test the bot's ping to the Discord API",
  permission: "can_ping",

  async run({ message: msg, pluginData }) {
    const times: number[] = [];
    const messages: Message[] = [];
    let msgToMsgDelay: number | undefined;

    for (let i = 0; i < 4; i++) {
      const start = performance.now();
      const message = await msg.channel.createMessage(`Calculating ping... ${i + 1}`);
      times.push(performance.now() - start);
      messages.push(message);

      if (msgToMsgDelay === undefined) {
        msgToMsgDelay = message.timestamp - msg.timestamp;
      }
    }

    const highest = Math.round(Math.max(...times));
    const lowest = Math.round(Math.min(...times));
    const mean = Math.round(times.reduce((total, ms) => total + ms, 0) / times.length);

    const shard = pluginData.client.shards.get(pluginData.client.guildShardMap[pluginData.guild.id])!;

    msg.channel.createMessage(
      trimLines(`
      **Ping:**
      Lowest: **${lowest}ms**
      Highest: **${highest}ms**
      Mean: **${mean}ms**
      Time between ping command and first reply: **${msgToMsgDelay!}ms**
      Shard latency: **${shard.latency}ms**
    `),
    );

    // Clean up test messages
    pluginData.client
      .deleteMessages(
        messages[0].channel.id,
        messages.map(m => m.id),
      )
      .catch(noop);
  },
});
