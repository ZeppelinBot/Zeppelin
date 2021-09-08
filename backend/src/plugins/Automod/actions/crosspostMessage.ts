import { Message } from "discord.js";
import * as t from "io-ts";
import { ChannelTypeStrings } from "src/types";
import { noop } from "src/utils";
import { automodAction } from "../helpers";

export const CrosspostMessageAction = automodAction({
  configType: t.type({}),
  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig }) {
    const messages = contexts
      .filter(c => c.message?.id)
      .map(c => {
        const channel = pluginData.guild.channels.cache.get(c.message!.channel_id);
        if (channel?.type === ChannelTypeStrings.NEWS && channel.isText()) {
          // .isText() to fix the typings
          return channel.messages.fetch(c.message!.id);
        }
        return null;
      });

    for await (const msg of messages) {
      if (msg?.crosspostable) await msg?.crosspost().catch(noop);
    }
  },
});
