import { Message } from "discord.js";
import { noop, trimLines } from "../../../utils";
import { utilityCmd } from "../types";

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
      const message = await msg.channel.send(`Calculating ping... ${i + 1}`);
      times.push(performance.now() - start);
      messages.push(message);

      if (msgToMsgDelay === undefined) {
        msgToMsgDelay = message.createdTimestamp - msg.createdTimestamp;
      }
    }

    const highest = Math.round(Math.max(...times));
    const lowest = Math.round(Math.min(...times));
    const mean = Math.round(times.reduce((total, ms) => total + ms, 0) / times.length);

    msg.channel.send(
      trimLines(`
      **Ping:**
      Lowest: **${lowest}ms**
      Highest: **${highest}ms**
      Mean: **${mean}ms**
      Time between ping command and first reply: **${msgToMsgDelay!}ms**
      Shard latency: **${pluginData.client.ws.ping}ms**
    `),
    );

    // Clean up test messages
    msg.channel.bulkDelete(messages).catch(noop);
  },
});
