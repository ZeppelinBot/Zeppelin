import { Message } from "discord.js";
import { commandAliasesEvt } from "../types.js";

export const DispatchAliasEvt = commandAliasesEvt({
  event: "messageCreate",
  async listener({ args: { message: msg }, pluginData }) {
    if (!msg.guild || !msg.content) return;
    if (msg.author.bot || msg.webhookId) return;

    const matchers = pluginData.state.matchers ?? [];
    if (matchers.length === 0) return;

    const matchingAlias = matchers.find((matcher) => matcher.regex.test(msg.content));
    if (!matchingAlias) return;

    const newContent = msg.content.replace(matchingAlias.regex, matchingAlias.replacement);
    if (newContent === msg.content) return;

    const copiedMessage = Object.create(msg);
    copiedMessage.content = newContent;

    await pluginData.getVetyInstance().dispatchMessageCommands(copiedMessage as Message);
  },
});
