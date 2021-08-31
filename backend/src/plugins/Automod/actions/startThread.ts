import { ThreadAutoArchiveDuration } from "discord-api-types";
import { TextChannel } from "discord.js";
import * as t from "io-ts";
import { renderTemplate, TemplateSafeValueContainer } from "src/templateFormatter";
import { tDelayString, tNullable } from "src/utils";
import { userToTemplateSafeUser } from "src/utils/templateSafeObjects";
import { noop } from "../../../utils";
import { automodAction } from "../helpers";

export const StartThreadAction = automodAction({
  configType: t.type({
    name: tNullable(t.string),
    auto_archive: tNullable(t.number),
    private: tNullable(t.boolean),
    slowmode: tNullable(tDelayString),
  }),

  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    // check if the message still exists, we don't want to create threads for deleted messages
    const threads = contexts.filter(c => {
      if (!c.message || !c.user) return false;
      const channel = pluginData.guild.channels.cache.get(c.message.channel_id);
      if (channel?.type !== "GUILD_TEXT" || !channel.isText()) return false; // for some reason the typing here for channel.type defaults to ThreadChannelTypes (?)
      return channel.messages.cache.has(c.message.id);
    });
    let autoArchive: ThreadAutoArchiveDuration;
    if (actionConfig.auto_archive === 1440) {
      autoArchive = ThreadAutoArchiveDuration.OneDay;
    } else if (actionConfig.auto_archive === 4320) {
      autoArchive = ThreadAutoArchiveDuration.ThreeDays;
    } else if (actionConfig.auto_archive === 10080) {
      autoArchive = ThreadAutoArchiveDuration.OneWeek;
    } else {
      autoArchive = ThreadAutoArchiveDuration.OneHour;
    }

    for (const c of threads) {
      const channel = pluginData.guild.channels.cache.get(c.message!.channel_id) as TextChannel;
      const renderThreadName = async str =>
        renderTemplate(
          str,
          new TemplateSafeValueContainer({
            user: userToTemplateSafeUser(c.user!),
          }),
        );
      const threadName = await renderThreadName(actionConfig.name ?? "{user.username}#{user.discriminator}s thread");
      await channel.threads
        .create({
          name: threadName,
          autoArchiveDuration: autoArchive,
          type: actionConfig.private ? "GUILD_PRIVATE_THREAD" : "GUILD_PUBLIC_THREAD",
          startMessage: !actionConfig.private ? c.message!.id : undefined,
        })
        .catch(noop);
    }
  },
});
