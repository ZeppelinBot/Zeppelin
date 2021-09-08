import { Message } from "discord.js";
import * as t from "io-ts";
import { ChannelTypeStrings } from "src/types";
import { automodAction } from "../helpers";

export const CrosspostMessageAction = automodAction({
  configType: t.type({}),
  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig }) {
    const messages = await Promise.all(
      contexts
        .filter(c => c.message?.id)
        .map(async c => {
          const channel = pluginData.guild.channels.cache.get(c.message!.channel_id);
          if (channel?.type === ChannelTypeStrings.NEWS && channel.isText()) {
            // .isText() to fix the typings
            const msg = await channel.messages.fetch(c.message!.id);
            return msg && msg.crosspostable ? msg : null;
          }
          return null;
        }),
    );

    for (const msg of messages) {
      await msg?.crosspost();
    }
  },
});
