import { GuildFeature, ThreadAutoArchiveDuration } from "discord-api-types";
import { TextChannel } from "discord.js";
import * as t from "io-ts";
import { renderTemplate, TemplateSafeValueContainer } from "src/templateFormatter";
import { convertDelayStringToMS, tDelayString, tNullable } from "src/utils";
import { savedMessageToTemplateSafeSavedMessage, userToTemplateSafeUser } from "src/utils/templateSafeObjects";
import { noop } from "../../../utils";
import { automodAction } from "../helpers";

export const StartThreadAction = automodAction({
  configType: t.type({
    name: tNullable(t.string),
    auto_archive: tNullable(t.number),
    private: tNullable(t.boolean),
    slowmode: tNullable(tDelayString),
    limit_per_channel: tNullable(t.number),
  }),

  defaultConfig: {
    limit_per_channel: 5,
  },

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    // check if the message still exists, we don't want to create threads for deleted messages
    const threads = contexts.filter(c => {
      if (!c.message || !c.user) return false;
      const channel = pluginData.guild.channels.cache.get(c.message.channel_id);
      if (channel?.type !== "GUILD_TEXT" || !channel.isText()) return false; // for some reason the typing here for channel.type defaults to ThreadChannelTypes (?)
      // check against max threads per channel
      if (actionConfig.limit_per_channel && actionConfig.limit_per_channel > 0) {
        const threadCount = [
          ...channel.threads.cache
            .filter(
              tr =>
                tr.ownerId === pluginData.client.application!.id &&
                !tr.deleted &&
                !tr.archived &&
                tr.parentId === channel.id,
            )
            .keys(),
        ].length; // very short line, yes yes
        if (threadCount >= actionConfig.limit_per_channel) return false;
      }
      return channel.messages.cache.has(c.message.id);
    });

    const guild = await pluginData.guild;
    let autoArchive: ThreadAutoArchiveDuration;
    if (actionConfig.auto_archive === 1440) {
      autoArchive = ThreadAutoArchiveDuration.OneDay;
    } else if (actionConfig.auto_archive === 4320 && guild.features.includes(GuildFeature.ThreeDayThreadArchive)) {
      autoArchive = ThreadAutoArchiveDuration.ThreeDays;
    } else if (actionConfig.auto_archive === 10080 && guild.features.includes(GuildFeature.SevenDayThreadArchive)) {
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
            msg: savedMessageToTemplateSafeSavedMessage(c.message!),
          }),
        );
      const threadName = await renderThreadName(actionConfig.name ?? "{user.username}#{user.discriminator}s thread");
      const thread = await channel.threads
        .create({
          name: threadName,
          autoArchiveDuration: autoArchive,
          type:
            actionConfig.private && guild.features.includes(GuildFeature.PrivateThreads)
              ? "GUILD_PRIVATE_THREAD"
              : "GUILD_PUBLIC_THREAD",
          startMessage:
            !actionConfig.private && guild.features.includes(GuildFeature.PrivateThreads) ? c.message!.id : undefined,
        })
        .catch(noop);
      if (actionConfig.slowmode && thread) {
        const dur = Math.ceil(Math.max(convertDelayStringToMS(actionConfig.slowmode) ?? 0, 0) / 1000);
        if (dur > 0) {
          await thread.setRateLimitPerUser(dur).catch(noop);
        }
      }
    }
  },
});
