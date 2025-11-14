import { ChannelType, GuildTextThreadCreateOptions, ThreadAutoArchiveDuration, ThreadChannel } from "discord.js";
import { z } from "zod";
import { TemplateParseError, TemplateSafeValueContainer, renderTemplate } from "../../../templateFormatter.js";
import { MINUTES, convertDelayStringToMS, noop, zBoundedCharacters, zDelayString } from "../../../utils.js";
import { savedMessageToTemplateSafeSavedMessage, userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { automodAction } from "../helpers.js";

const validThreadAutoArchiveDurations: ThreadAutoArchiveDuration[] = [
  ThreadAutoArchiveDuration.OneHour,
  ThreadAutoArchiveDuration.OneDay,
  ThreadAutoArchiveDuration.ThreeDays,
  ThreadAutoArchiveDuration.OneWeek,
];

export const StartThreadAction = automodAction({
  configSchema: z.strictObject({
    name: zBoundedCharacters(1, 100).nullable(),
    auto_archive: zDelayString,
    private: z.boolean().default(false),
    slowmode: zDelayString.nullable().default(null),
    limit_per_channel: z.number().nullable().default(5),
  }),

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    // check if the message still exists, we don't want to create threads for deleted messages
    const threads = contexts.filter((c) => {
      if (!c.message || !c.user) return false;
      const channel = pluginData.guild.channels.cache.get(c.message.channel_id);
      if (channel?.type !== ChannelType.GuildText || !channel.isTextBased()) return false; // for some reason the typing here for channel.type defaults to ThreadChannelTypes (?)
      // check against max threads per channel
      if (actionConfig.limit_per_channel && actionConfig.limit_per_channel > 0) {
        const threadCount = channel.threads.cache.filter(
          (tr) => tr.ownerId === pluginData.client.user!.id && !tr.archived && tr.parentId === channel.id,
        ).size;
        if (threadCount >= actionConfig.limit_per_channel) return false;
      }
      return true;
    });

    const archiveSet = actionConfig.auto_archive
      ? Math.ceil(Math.max(convertDelayStringToMS(actionConfig.auto_archive) ?? 0, 0) / MINUTES)
      : ThreadAutoArchiveDuration.OneDay;
    const autoArchive = validThreadAutoArchiveDurations.includes(archiveSet)
      ? (archiveSet as ThreadAutoArchiveDuration)
      : ThreadAutoArchiveDuration.OneHour;

    for (const threadContext of threads) {
      const channel = pluginData.guild.channels.cache.get(threadContext.message!.channel_id);
      if (!channel || !("threads" in channel) || channel.isThreadOnly()) continue;

      let threadName: string;
      try {
        threadName = await renderTemplate(
          actionConfig.name ?? "{user.renderedUsername}'s thread",
          new TemplateSafeValueContainer({
            user: userToTemplateSafeUser(threadContext.user!),
            msg: savedMessageToTemplateSafeSavedMessage(threadContext.message!),
          }),
        );
      } catch (err) {
        if (err instanceof TemplateParseError) {
          pluginData.getPlugin(LogsPlugin).logBotAlert({
            body: `Error in thread name format of automod rule ${ruleName}: ${err.message}`,
          });
          return;
        }
        throw err;
      }

      const threadOptions: GuildTextThreadCreateOptions<unknown> = {
        name: threadName,
        autoArchiveDuration: autoArchive,
        startMessage: !actionConfig.private ? threadContext.message!.id : undefined,
      };

      let thread: ThreadChannel | undefined;
      if (channel.type === ChannelType.GuildNews) {
        thread = await channel.threads
          .create({
            ...threadOptions,
            type: ChannelType.AnnouncementThread,
          })
          .catch(() => undefined);
      } else {
        thread = await channel.threads
          .create({
            ...threadOptions,
            type: actionConfig.private ? ChannelType.PrivateThread : ChannelType.PublicThread,
            startMessage: !actionConfig.private ? threadContext.message!.id : undefined,
          })
          .catch(() => undefined);
      }
      if (actionConfig.slowmode && thread) {
        const dur = Math.ceil(Math.max(convertDelayStringToMS(actionConfig.slowmode) ?? 0, 0) / 1000);
        if (dur > 0) {
          await thread.setRateLimitPerUser(dur).catch(noop);
        }
      }
    }
  },
});
