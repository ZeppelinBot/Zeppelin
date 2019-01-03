import { Plugin, decorators as d } from "knub";
import { GuildChannel, Message, TextChannel, Constants as ErisConstants, User } from "eris";
import { convertDelayStringToMS, errorMessage, noop, successMessage } from "../utils";
import { GuildSlowmodes } from "../data/GuildSlowmodes";
import humanizeDuration from "humanize-duration";

export class SlowmodePlugin extends Plugin {
  protected slowmodes: GuildSlowmodes;
  protected clearInterval;

  getDefaultOptions() {
    return {
      permissions: {
        manage: false,
        affected: true
      },

      overrides: [
        {
          level: ">=50",
          permissions: {
            manage: true,
            affected: false
          }
        }
      ]
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
   * Applies slowmode to the specified user id on the specified channel.
   * This sets the channel permissions so the user is unable to send messages there, and saves the slowmode in the db.
   */
  async applySlowmodeToUserId(channel: GuildChannel & TextChannel, userId: string) {
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
   * Removes slowmode from the specified user id on the specified channel.
   * This reverts the channel permissions changed above and clears the database entry.
   */
  async removeSlowmodeFromUserId(channel: GuildChannel & TextChannel, userId: string) {
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
   * COMMAND: Disable slowmode on the specified channel. This also removes any currently applied slowmodes on the channel.
   */
  @d.command("slowmode disable", "<channel:channel>")
  @d.permission("manage")
  async disableSlowmodeCmd(msg: Message, args: { channel: GuildChannel & TextChannel }) {
    const slowmode = await this.slowmodes.getChannelSlowmode(args.channel.id);
    if (!slowmode) {
      msg.channel.createMessage(errorMessage("Channel is not on slowmode!"));
      return;
    }

    // Disable channel slowmode
    const initMsg = await msg.channel.createMessage("Disabling slowmode...");
    await this.slowmodes.clearChannelSlowmode(args.channel.id);

    // Remove currently applied slowmodes
    const users = await this.slowmodes.getChannelSlowmodeUsers(args.channel.id);
    const failedUsers = [];

    for (const slowmodeUser of users) {
      try {
        await this.removeSlowmodeFromUserId(args.channel, slowmodeUser.user_id);
      } catch (e) {
        // Removing the slowmode failed. Record this so the permissions can be changed manually, and remove the database entry.
        failedUsers.push(slowmodeUser.user_id);
        await this.slowmodes.clearSlowmodeUser(args.channel.id, slowmodeUser.user_id);
      }
    }

    if (failedUsers.length) {
      msg.channel.createMessage(
        successMessage(
          `Slowmode disabled! Failed to remove slowmode from the following users:\n\n<@!${failedUsers.join(">\n<@!")}>`
        )
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

    await this.removeSlowmodeFromUserId(args.channel, args.user.id);
    msg.channel.createMessage(
      successMessage(
        `Slowmode cleared from **${args.user.username}#${args.user.discriminator}** in <#${args.channel.id}>`
      )
    );
  }

  /**
   * COMMAND: Enable slowmode on the specified channel
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
    await this.slowmodes.setChannelSlowmode(channel.id, seconds);

    const humanizedSlowmodeTime = humanizeDuration(seconds * 1000);
    msg.channel.createMessage(
      successMessage(`Slowmode enabled for <#${channel.id}> (1 message in ${humanizedSlowmodeTime})`)
    );
  }

  /**
   * EVENT: On every new message, check if the channel has slowmode. If it does, apply slowmode to the user.
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

    await this.applySlowmodeToUserId(msg.channel as GuildChannel & TextChannel, msg.author.id);
  }

  /**
   * Clears all expired slowmodes in this guild
   */
  async clearExpiredSlowmodes() {
    const expiredSlowmodeUsers = await this.slowmodes.getExpiredSlowmodeUsers();
    for (const user of expiredSlowmodeUsers) {
      const channel = this.guild.channels.get(user.channel_id);
      if (!channel) {
        await this.slowmodes.clearSlowmodeUser(user.channel_id, user.user_id);
        continue;
      }

      await this.removeSlowmodeFromUserId(channel as GuildChannel & TextChannel, user.user_id);
    }
  }
}
