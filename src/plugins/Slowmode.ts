import { decorators as d, IPluginOptions } from "knub";
import { GuildChannel, Message, TextChannel, Constants as ErisConstants, User } from "eris";
import { convertDelayStringToMS, errorMessage, noop, successMessage } from "../utils";
import { GuildSlowmodes } from "../data/GuildSlowmodes";
import humanizeDuration from "humanize-duration";
import { ZeppelinPlugin } from "./ZeppelinPlugin";

interface ISlowmodePluginConfig {
  use_native_slowmode: boolean;
}

interface ISlowmodePluginPermissions {
  manage: boolean;
  affected: boolean;
}

export class SlowmodePlugin extends ZeppelinPlugin<ISlowmodePluginConfig, ISlowmodePluginPermissions> {
  public static pluginName = "slowmode";

  protected slowmodes: GuildSlowmodes;
  protected clearInterval;

  getDefaultOptions(): IPluginOptions<ISlowmodePluginConfig, ISlowmodePluginPermissions> {
    return {
      config: {
        use_native_slowmode: true,
      },

      permissions: {
        manage: false,
        affected: true,
      },

      overrides: [
        {
          level: ">=50",
          permissions: {
            manage: true,
            affected: false,
          },
        },
      ],
    };
  }

  onLoad() {
    this.slowmodes = GuildSlowmodes.getInstance(this.guildId);
    this.clearInterval = setInterval(() => this.clearExpiredSlowmodes(), 2000);
  }

  onUnload() {
    clearInterval(this.clearInterval);
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
    await channel.editPermission(userId, newAllowedPermissions, newDeniedPermissions, "member");

    await this.slowmodes.addSlowmodeUser(channel.id, userId);
  }

  /**
   * Clears bot-maintained slowmode from the specified user id on the specified channel.
   * This reverts the channel permissions changed above and clears the database entry.
   */
  async clearBotSlowmodeFromUserId(channel: GuildChannel & TextChannel, userId: string) {
    // We only need to tweak permissions if there is an existing permission override
    // In most cases there should be, since one is created in applySlowmodeToUserId()
    const existingOverride = channel.permissionOverwrites.get(userId);
    if (existingOverride) {
      if (existingOverride.allow === 0 && existingOverride.deny === ErisConstants.Permissions.sendMessages) {
        // If the only override for this user is what we applied earlier, remove the entire permission overwrite
        await channel.deletePermission(userId);
      } else {
        // Otherwise simply negate the sendMessages permission from the denied permissions
        const newDeniedPermissions = existingOverride.deny & ~ErisConstants.Permissions.sendMessages;
        await channel.editPermission(userId, existingOverride.allow, newDeniedPermissions, "member");
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
  @d.permission("manage")
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
  @d.command("slowmode clear", "<channel:channel> <user:user>")
  @d.permission("manage")
  async clearSlowmodeCmd(msg: Message, args: { channel: GuildChannel & TextChannel; user: User }) {
    const channelSlowmode = await this.slowmodes.getChannelSlowmode(args.channel.id);
    if (!channelSlowmode) {
      msg.channel.createMessage(errorMessage("Channel doesn't have slowmode!"));
      return;
    }

    await this.clearBotSlowmodeFromUserId(args.channel, args.user.id);
    msg.channel.createMessage(
      successMessage(
        `Slowmode cleared from **${args.user.username}#${args.user.discriminator}** in <#${args.channel.id}>`,
      ),
    );
  }

  /**
   * COMMAND: Set slowmode for the specified channel
   */
  @d.command("slowmode", "<channel:channel> <time:string>")
  @d.command("slowmode", "<time:string>")
  @d.permission("manage")
  async slowmodeCmd(msg: Message, args: { channel?: GuildChannel & TextChannel; time: string }) {
    const channel = args.channel || msg.channel;

    if (channel == null || !(channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel must be a text channel"));
      return;
    }

    const seconds = Math.ceil(convertDelayStringToMS(args.time) / 1000);
    const useNativeSlowmode = this.getConfigForChannel(channel).use_native_slowmode && seconds <= 120;

    if (useNativeSlowmode) {
      // Native slowmode

      // If there is an existing bot-maintained slowmode, disable that first
      const existingBotSlowmode = await this.slowmodes.getChannelSlowmode(channel.id);
      if (existingBotSlowmode) {
        await this.disableBotSlowmodeForChannel(channel);
      }

      // Set slowmode
      channel.edit({
        rateLimitPerUser: seconds,
      });
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
    msg.channel.createMessage(
      successMessage(`Set ${humanizedSlowmodeTime} slowmode for <#${channel.id}> (${slowmodeType})`),
    );
  }

  /**
   * EVENT: On every message, check if the channel has a bot-maintained slowmode. If it does, apply slowmode to the user.
   * If the user already had slowmode but was still able to send a message (e.g. sending a lot of messages at once),
   * remove the messages sent after slowmode was applied.
   */
  @d.event("messageCreate")
  @d.permission("affected")
  async onMessageCreate(msg: Message) {
    if (msg.author.bot) return;

    const channelSlowmode = await this.slowmodes.getChannelSlowmode(msg.channel.id);
    if (!channelSlowmode) return;

    const userHasSlowmode = await this.slowmodes.userHasSlowmode(msg.channel.id, msg.author.id);
    if (userHasSlowmode) {
      msg.delete();
      return;
    }

    await this.applyBotSlowmodeToUserId(msg.channel as GuildChannel & TextChannel, msg.author.id);
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

      await this.clearBotSlowmodeFromUserId(channel as GuildChannel & TextChannel, user.user_id);
    }
  }
}
