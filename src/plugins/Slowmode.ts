import { decorators as d, IPluginOptions, logger } from "knub";
import { GuildChannel, Message, TextChannel, Constants as ErisConstants, User } from "eris";
import {
  convertDelayStringToMS,
  createChunkedMessage,
  errorMessage,
  noop,
  stripObjectToScalars,
  successMessage,
  UnknownUser,
} from "../utils";
import { GuildSlowmodes } from "../data/GuildSlowmodes";
import humanizeDuration from "humanize-duration";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { SavedMessage } from "../data/entities/SavedMessage";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import DiscordRESTError from "eris/lib/errors/DiscordRESTError"; // tslint:disable-line
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import * as t from "io-ts";

const ConfigSchema = t.type({
  use_native_slowmode: t.boolean,

  can_manage: t.boolean,
  is_affected: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

const NATIVE_SLOWMODE_LIMIT = 6 * 60 * 60; // 6 hours
const MAX_SLOWMODE = 60 * 60 * 24 * 365 * 100; // 100 years
const BOT_SLOWMODE_CLEAR_INTERVAL = 60 * 1000;

export class SlowmodePlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "slowmode";
  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Slowmode",
  };

  protected slowmodes: GuildSlowmodes;
  protected savedMessages: GuildSavedMessages;
  protected logs: GuildLogs;
  protected clearInterval;

  private onMessageCreateFn;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        use_native_slowmode: true,

        can_manage: false,
        is_affected: true,
      },

      overrides: [
        {
          level: ">=50",
          config: {
            can_manage: true,
            is_affected: false,
          },
        },
      ],
    };
  }

  onLoad() {
    this.slowmodes = GuildSlowmodes.getGuildInstance(this.guildId);
    this.savedMessages = GuildSavedMessages.getGuildInstance(this.guildId);
    this.logs = new GuildLogs(this.guildId);
    this.clearInterval = setInterval(() => this.clearExpiredSlowmodes(), BOT_SLOWMODE_CLEAR_INTERVAL);

    this.onMessageCreateFn = this.onMessageCreate.bind(this);
    this.savedMessages.events.on("create", this.onMessageCreateFn);
  }

  onUnload() {
    clearInterval(this.clearInterval);
    this.savedMessages.events.off("create", this.onMessageCreateFn);
  }

  /**
   * Applies a bot-maintained slowmode to the specified user id on the specified channel.
   * This sets the channel permissions so the user is unable to send messages there, and saves the slowmode in the db.
   */
  async applyBotSlowmodeToUserId(channel: GuildChannel & TextChannel, userId: string) {
    // Deny sendMessage permission from the user. If there are existing permission overwrites, take those into account.
    const existingOverride = channel.permissionOverwrites.get(userId);
    const newDeniedPermissions =
      (existingOverride ? existingOverride.deny : 0) | ErisConstants.Permissions.sendMessages;
    const newAllowedPermissions =
      (existingOverride ? existingOverride.allow : 0) & ~ErisConstants.Permissions.sendMessages;

    try {
      await channel.editPermission(userId, newAllowedPermissions, newDeniedPermissions, "member");
    } catch (e) {
      const user = this.bot.users.get(userId) || new UnknownUser({ id: userId });

      if (e instanceof DiscordRESTError && e.code === 50013) {
        logger.warn(
          `Missing permissions to apply bot slowmode to user ${userId} on channel ${channel.name} (${
            channel.id
          }) on server ${this.guild.name} (${this.guildId})`,
        );
        this.logs.log(LogType.BOT_ALERT, {
          body: `Missing permissions to apply bot slowmode to {userMention(user)} in {channelMention(channel)}`,
          user: stripObjectToScalars(user),
          channel: stripObjectToScalars(channel),
        });
      } else {
        this.logs.log(LogType.BOT_ALERT, {
          body: `Failed to apply bot slowmode to {userMention(user)} in {channelMention(channel)}`,
          user: stripObjectToScalars(user),
          channel: stripObjectToScalars(channel),
        });
        throw e;
      }
    }

    await this.slowmodes.addSlowmodeUser(channel.id, userId);
  }

  /**
   * Clears bot-maintained slowmode from the specified user id on the specified channel.
   * This reverts the channel permissions changed above and clears the database entry.
   */
  async clearBotSlowmodeFromUserId(channel: GuildChannel & TextChannel, userId: string, force = false) {
    try {
      // Remove permission overrides from the channel for this user
      // Previously we diffed the overrides so we could clear the "send messages" override without touching other
      // overrides. Unfortunately, it seems that was a bit buggy - we didn't always receive the event for the changed
      // overrides and then we also couldn't diff against them. For consistency's sake, we just delete the override now.
      await channel.deletePermission(userId);
    } catch (e) {
      if (!force) {
        throw e;
      }
    }

    await this.slowmodes.clearSlowmodeUser(channel.id, userId);
  }

  /**
   * Disable slowmode on the specified channel. Clears any existing slowmode perms.
   */
  async disableBotSlowmodeForChannel(channel: GuildChannel & TextChannel) {
    // Disable channel slowmode
    await this.slowmodes.deleteChannelSlowmode(channel.id);

    // Remove currently applied slowmodes
    const users = await this.slowmodes.getChannelSlowmodeUsers(channel.id);
    const failedUsers = [];

    for (const slowmodeUser of users) {
      try {
        await this.clearBotSlowmodeFromUserId(channel, slowmodeUser.user_id);
      } catch (e) {
        // Removing the slowmode failed. Record this so the permissions can be changed manually, and remove the database entry.
        failedUsers.push(slowmodeUser.user_id);
        await this.slowmodes.clearSlowmodeUser(channel.id, slowmodeUser.user_id);
      }
    }

    return { failedUsers };
  }

  /**
   * COMMAND: Disable slowmode on the specified channel
   */
  @d.command("slowmode disable", "<channel:channel>")
  @d.permission("can_manage")
  async disableSlowmodeCmd(msg: Message, args: { channel: GuildChannel & TextChannel }) {
    const botSlowmode = await this.slowmodes.getChannelSlowmode(args.channel.id);
    const hasNativeSlowmode = args.channel.rateLimitPerUser;

    if (!botSlowmode && hasNativeSlowmode === 0) {
      msg.channel.createMessage(errorMessage("Channel is not on slowmode!"));
      return;
    }

    const initMsg = await msg.channel.createMessage("Disabling slowmode...");

    // Disable bot-maintained slowmode
    let failedUsers = [];
    if (botSlowmode) {
      const result = await this.disableBotSlowmodeForChannel(args.channel);
      failedUsers = result.failedUsers;
    }

    // Disable native slowmode
    if (hasNativeSlowmode) {
      await args.channel.edit({ rateLimitPerUser: 0 });
    }

    if (failedUsers.length) {
      msg.channel.createMessage(
        successMessage(
          `Slowmode disabled! Failed to clear slowmode from the following users:\n\n<@!${failedUsers.join(">\n<@!")}>`,
        ),
      );
    } else {
      msg.channel.createMessage(successMessage("Slowmode disabled!"));
      initMsg.delete().catch(noop);
    }
  }

  /**
   * COMMAND: Clear slowmode from a specific user on a specific channel
   */
  @d.command("slowmode clear", "<channel:channel> <user:resolvedUserLoose>", {
    options: [
      {
        name: "force",
        type: "bool",
      },
    ],
  })
  @d.permission("can_manage")
  async clearSlowmodeCmd(msg: Message, args: { channel: GuildChannel & TextChannel; user: User; force?: boolean }) {
    const channelSlowmode = await this.slowmodes.getChannelSlowmode(args.channel.id);
    if (!channelSlowmode) {
      msg.channel.createMessage(errorMessage("Channel doesn't have slowmode!"));
      return;
    }

    try {
      await this.clearBotSlowmodeFromUserId(args.channel, args.user.id, args.force);
    } catch (e) {
      return this.sendErrorMessage(
        msg.channel,
        `Failed to clear slowmode from **${args.user.username}#${args.user.discriminator}** in <#${args.channel.id}>`,
      );
    }

    this.sendSuccessMessage(
      msg.channel,
      `Slowmode cleared from **${args.user.username}#${args.user.discriminator}** in <#${args.channel.id}>`,
    );
  }

  @d.command("slowmode list")
  @d.permission("can_manage")
  async slowmodeListCmd(msg: Message) {
    const channels = this.guild.channels;
    const slowmodes: Array<{ channel: GuildChannel; seconds: number; native: boolean }> = [];

    for (const channel of channels.values()) {
      if (!(channel instanceof TextChannel)) continue;

      // Bot slowmode
      const botSlowmode = await this.slowmodes.getChannelSlowmode(channel.id);
      if (botSlowmode) {
        slowmodes.push({ channel, seconds: botSlowmode.slowmode_seconds, native: false });
        continue;
      }

      // Native slowmode
      if (channel.rateLimitPerUser) {
        slowmodes.push({ channel, seconds: channel.rateLimitPerUser, native: true });
        continue;
      }
    }

    if (slowmodes.length) {
      const lines = slowmodes.map(slowmode => {
        const humanized = humanizeDuration(slowmode.seconds * 1000);

        const type = slowmode.native ? "native slowmode" : "bot slowmode";

        return `<#${slowmode.channel.id}> **${humanized}** ${type}`;
      });

      createChunkedMessage(msg.channel, lines.join("\n"));
    } else {
      msg.channel.createMessage(errorMessage("No active slowmodes!"));
    }
  }

  @d.command("slowmode", "[channel:channel]")
  @d.permission("can_manage")
  async showSlowmodeCmd(msg: Message, args: { channel: GuildChannel & TextChannel }) {
    const channel = args.channel || msg.channel;

    if (channel == null || !(channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel must be a text channel"));
      return;
    }

    let currentSlowmode = channel.rateLimitPerUser;
    let isNative = true;

    if (!currentSlowmode) {
      const botSlowmode = await this.slowmodes.getChannelSlowmode(channel.id);
      if (botSlowmode) {
        currentSlowmode = botSlowmode.slowmode_seconds;
        isNative = false;
      }
    }

    if (currentSlowmode) {
      const humanized = humanizeDuration(channel.rateLimitPerUser * 1000);
      const slowmodeType = isNative ? "native" : "bot-maintained";
      msg.channel.createMessage(`The current slowmode of <#${channel.id}> is **${humanized}** (${slowmodeType})`);
    } else {
      msg.channel.createMessage("Channel is not on slowmode");
    }
  }

  /**
   * COMMAND: Set slowmode for the specified channel
   */
  @d.command("slowmode", "<channel:channel> <time:string>", {
    overloads: ["<time:string>"],
  })
  @d.permission("can_manage")
  async slowmodeCmd(msg: Message, args: { channel?: GuildChannel & TextChannel; time: string }) {
    const channel = args.channel || msg.channel;

    if (channel == null || !(channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel must be a text channel"));
      return;
    }

    const seconds = Math.ceil(convertDelayStringToMS(args.time, "s") / 1000);
    const useNativeSlowmode = this.getConfigForChannel(channel).use_native_slowmode && seconds <= NATIVE_SLOWMODE_LIMIT;

    if (seconds === 0) {
      return this.disableSlowmodeCmd(msg, { channel });
    }

    if (seconds > MAX_SLOWMODE) {
      this.sendErrorMessage(msg.channel, `Sorry, slowmodes can be at most 100 years long. Maybe 99 would be enough?`);
      return;
    }

    if (useNativeSlowmode) {
      // Native slowmode

      // If there is an existing bot-maintained slowmode, disable that first
      const existingBotSlowmode = await this.slowmodes.getChannelSlowmode(channel.id);
      if (existingBotSlowmode) {
        await this.disableBotSlowmodeForChannel(channel);
      }

      // Set slowmode
      try {
        await channel.edit({
          rateLimitPerUser: seconds,
        });
      } catch (e) {
        return this.sendErrorMessage(msg.channel, "Failed to set native slowmode (check permissions)");
      }
    } else {
      // Bot-maintained slowmode

      // If there is an existing native slowmode, disable that first
      if (channel.rateLimitPerUser) {
        await channel.edit({
          rateLimitPerUser: 0,
        });
      }

      await this.slowmodes.setChannelSlowmode(channel.id, seconds);
    }

    const humanizedSlowmodeTime = humanizeDuration(seconds * 1000);
    const slowmodeType = useNativeSlowmode ? "native slowmode" : "bot-maintained slowmode";
    this.sendSuccessMessage(
      msg.channel,
      `Set ${humanizedSlowmodeTime} slowmode for <#${channel.id}> (${slowmodeType})`,
    );
  }

  /**
   * EVENT: On every message, check if the channel has a bot-maintained slowmode. If it does, apply slowmode to the user.
   * If the user already had slowmode but was still able to send a message (e.g. sending a lot of messages at once),
   * remove the messages sent after slowmode was applied.
   */
  async onMessageCreate(msg: SavedMessage) {
    if (msg.is_bot) return;

    const channel = this.guild.channels.get(msg.channel_id) as GuildChannel & TextChannel;
    if (!channel) return;

    // Don't apply slowmode if the lock was interrupted earlier (e.g. the message was caught by word filters)
    const thisMsgLock = await this.locks.acquire(`message-${msg.id}`);
    if (thisMsgLock.interrupted) return;

    // Check if this channel even *has* a bot-maintained slowmode
    const channelSlowmode = await this.slowmodes.getChannelSlowmode(channel.id);
    if (!channelSlowmode) return thisMsgLock.unlock();

    // Make sure this user is affected by the slowmode
    const member = await this.getMember(msg.user_id);
    const isAffected = this.hasPermission("is_affected", { channelId: channel.id, userId: msg.user_id, member });
    if (!isAffected) return thisMsgLock.unlock();

    // Delete any extra messages sent after a slowmode was already applied
    const userHasSlowmode = await this.slowmodes.userHasSlowmode(channel.id, msg.user_id);
    if (userHasSlowmode) {
      const message = await channel.getMessage(msg.id);
      if (message) {
        message.delete();
        return thisMsgLock.interrupt();
      }

      return thisMsgLock.unlock();
    }

    await this.applyBotSlowmodeToUserId(channel, msg.user_id);
    thisMsgLock.unlock();
  }

  /**
   * Clears all expired bot-maintained user slowmodes in this guild
   */
  async clearExpiredSlowmodes() {
    const expiredSlowmodeUsers = await this.slowmodes.getExpiredSlowmodeUsers();
    for (const user of expiredSlowmodeUsers) {
      const channel = this.guild.channels.get(user.channel_id);
      if (!channel) {
        await this.slowmodes.clearSlowmodeUser(user.channel_id, user.user_id);
        continue;
      }

      try {
        await this.clearBotSlowmodeFromUserId(channel as GuildChannel & TextChannel, user.user_id);
      } catch (e) {
        logger.error(e);

        const realUser = this.bot.users.get(user.user_id) || new UnknownUser({ id: user.user_id });
        this.logs.log(LogType.BOT_ALERT, {
          body: `Failed to clear slowmode permissions from {userMention(user)} in {channelMention(channel)}`,
          user: stripObjectToScalars(realUser),
          channel: stripObjectToScalars(channel),
        });
      }
    }
  }
}
