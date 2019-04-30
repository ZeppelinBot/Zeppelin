import { decorators as d, IPluginOptions, logger } from "knub";
import { CustomEmoji, errorMessage, isSnowflake, noop, sleep, successMessage } from "../utils";
import { GuildReactionRoles } from "../data/GuildReactionRoles";
import { Message, TextChannel } from "eris";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { Queue } from "../Queue";
import { ReactionRole } from "../data/entities/ReactionRole";
import Timeout = NodeJS.Timeout;
import DiscordRESTError from "eris/lib/errors/DiscordRESTError"; // tslint:disable-line

type ReactionRolePair = [string, string, string?];

const MIN_AUTO_REFRESH = 1000 * 60 * 15; // 15min minimum, let's not abuse the API
const CLEAR_ROLES_EMOJI = "❌";
const ROLE_CHANGE_BATCH_DEBOUNCE_TIME = 1500;

type RoleChangeMode = "+" | "-";

type PendingMemberRoleChanges = {
  timeout: Timeout;
  applyFn: () => void;
  changes: Array<{
    mode: RoleChangeMode;
    roleId: string;
  }>;
};

interface IReactionRolesPluginConfig {
  auto_refresh_interval: number;

  can_manage: boolean;
}

export class ReactionRolesPlugin extends ZeppelinPlugin<IReactionRolesPluginConfig> {
  public static pluginName = "reaction_roles";

  protected reactionRoles: GuildReactionRoles;
  protected savedMessages: GuildSavedMessages;

  protected reactionRemoveQueue: Queue;
  protected pendingRoleChanges: Map<string, PendingMemberRoleChanges>;
  protected pendingRefreshes: Set<string>;

  private autoRefreshTimeout;

  getDefaultOptions(): IPluginOptions<IReactionRolesPluginConfig> {
    return {
      config: {
        auto_refresh_interval: null,

        can_manage: false,
      },

      overrides: [
        {
          level: ">=100",
          config: {
            can_manage: true,
          },
        },
      ],
    };
  }

  async onLoad() {
    this.reactionRoles = GuildReactionRoles.getInstance(this.guildId);
    this.savedMessages = GuildSavedMessages.getInstance(this.guildId);
    this.reactionRemoveQueue = new Queue();
    this.pendingRoleChanges = new Map();
    this.pendingRefreshes = new Set();

    let autoRefreshInterval = this.getConfig().auto_refresh_interval;
    if (autoRefreshInterval != null) {
      autoRefreshInterval = Math.max(MIN_AUTO_REFRESH, autoRefreshInterval);
      this.autoRefreshLoop(autoRefreshInterval);
    }
  }

  async onUnload() {
    if (this.autoRefreshTimeout) {
      clearTimeout(this.autoRefreshTimeout);
    }
  }

  async autoRefreshLoop(interval: number) {
    this.autoRefreshTimeout = setTimeout(async () => {
      await this.runAutoRefresh();
      this.autoRefreshLoop(interval);
    }, interval);
  }

  async runAutoRefresh() {
    // Refresh reaction roles on all reaction role messages
    const reactionRoles = await this.reactionRoles.all();
    const idPairs = new Set(reactionRoles.map(r => `${r.channel_id}-${r.message_id}`));
    for (const pair of idPairs) {
      const [channelId, messageId] = pair.split("-");
      await this.refreshReactionRoles(channelId, messageId);
    }
  }

  /**
   * Refreshes the reaction roles in a message. Basically just calls applyReactionRoleReactionsToMessage().
   */
  async refreshReactionRoles(channelId: string, messageId: string) {
    const pendingKey = `${channelId}-${messageId}`;
    if (this.pendingRefreshes.has(pendingKey)) return;
    this.pendingRefreshes.add(pendingKey);

    try {
      const reactionRoles = await this.reactionRoles.getForMessage(messageId);
      await this.applyReactionRoleReactionsToMessage(channelId, messageId, reactionRoles);
    } finally {
      this.pendingRefreshes.delete(pendingKey);
    }
  }

  /**
   * Applies the reactions from the specified reaction roles to a message
   */
  async applyReactionRoleReactionsToMessage(channelId: string, messageId: string, reactionRoles: ReactionRole[]) {
    const channel = this.guild.channels.get(channelId) as TextChannel;

    let targetMessage;
    try {
      targetMessage = await channel.getMessage(messageId);
    } catch (e) {
      if (e instanceof DiscordRESTError) {
        logger.warn(`Reaction roles for unknown message ${messageId} in guild ${this.guild.name} (${this.guildId})`);
        return;
      } else {
        throw e;
      }
    }

    // Remove old reactions, if any
    const removeSleep = sleep(1250);
    await targetMessage.removeReactions();
    await removeSleep;

    // Add reaction role reactions
    for (const rr of reactionRoles) {
      const emoji = isSnowflake(rr.emoji) ? `foo:${rr.emoji}` : rr.emoji;

      const sleepTime = sleep(1250); // Make sure we only add 1 reaction per ~second so as not to hit rate limits
      await targetMessage.addReaction(emoji);
      await sleepTime;
    }

    // Add the "clear reactions" button
    await targetMessage.addReaction(CLEAR_ROLES_EMOJI);
  }

  /**
   * Adds a pending role change for a member. After a delay, all pending role changes for a member are applied at once.
   * This delay is refreshed any time new pending changes are added (i.e. "debounced").
   */
  async addMemberPendingRoleChange(memberId: string, mode: RoleChangeMode, roleId: string) {
    if (!this.pendingRoleChanges.has(memberId)) {
      const newPendingRoleChangeObj: PendingMemberRoleChanges = {
        timeout: null,
        changes: [],
        applyFn: async () => {
          const member = await this.guild.members.get(memberId);
          if (member) {
            const newRoleIds = new Set(member.roles);
            for (const change of newPendingRoleChangeObj.changes) {
              if (change.mode === "+") newRoleIds.add(change.roleId);
              else newRoleIds.delete(change.roleId);
            }

            try {
              await member.edit({
                roles: Array.from(newRoleIds.values()),
              });
            } catch (e) {
              logger.warn(
                `Failed to apply role changes to ${member.username}#${member.discriminator} (${member.id}): ${
                  e.message
                }`,
              );
            }

            this.pendingRoleChanges.delete(memberId);
          }
        },
      };

      this.pendingRoleChanges.set(memberId, newPendingRoleChangeObj);
    }

    const pendingRoleChangeObj = this.pendingRoleChanges.get(memberId);
    pendingRoleChangeObj.changes.push({ mode, roleId });

    if (pendingRoleChangeObj.timeout) clearTimeout(pendingRoleChangeObj.timeout);
    setTimeout(() => pendingRoleChangeObj.applyFn(), ROLE_CHANGE_BATCH_DEBOUNCE_TIME);
  }

  /**
   * COMMAND: Clear reaction roles from the specified message
   */
  @d.command("reaction_roles clear", "<messageId:string>")
  @d.permission("can_manage")
  async clearReactionRolesCmd(msg: Message, args: { messageId: string }) {
    const savedMessage = await this.savedMessages.find(args.messageId);
    if (!savedMessage) {
      msg.channel.createMessage(errorMessage("Unknown message"));
      return;
    }

    const existingReactionRoles = this.reactionRoles.getForMessage(args.messageId);
    if (!existingReactionRoles) {
      msg.channel.createMessage(errorMessage("Message doesn't have reaction roles on it"));
      return;
    }

    this.reactionRoles.removeFromMessage(args.messageId);

    const channel = this.guild.channels.get(savedMessage.channel_id) as TextChannel;
    const targetMessage = await channel.getMessage(savedMessage.id);
    await targetMessage.removeReactions();

    msg.channel.createMessage(successMessage("Reaction roles cleared"));
  }

  /**
   * COMMAND: Refresh reaction roles in the specified message by removing all reactions and re-adding them
   */
  @d.command("reaction_roles refresh", "<messageId:string>")
  @d.permission("can_manage")
  async refreshReactionRolesCmd(msg: Message, args: { messageId: string }) {
    const savedMessage = await this.savedMessages.find(args.messageId);
    if (!savedMessage) {
      msg.channel.createMessage(errorMessage("Unknown message"));
      return;
    }

    if (this.pendingRefreshes.has(`${savedMessage.channel_id}-${savedMessage.id}`)) {
      msg.channel.createMessage(errorMessage("Another refresh in progress"));
      return;
    }

    await this.refreshReactionRoles(savedMessage.channel_id, savedMessage.id);

    msg.channel.createMessage(successMessage("Reaction roles refreshed"));
  }

  /**
   * COMMAND: Initialize reaction roles on a message.
   * The second parameter, reactionRolePairs, is a list of emoji/role pairs separated by a newline. For example:
   * :zep_twitch: = 473086848831455234
   * :zep_ps4: = 543184300250759188
   */
  @d.command("reaction_roles", "<messageId:string> <reactionRolePairs:string$>")
  @d.permission("can_manage")
  async reactionRolesCmd(msg: Message, args: { messageId: string; reactionRolePairs: string }) {
    const savedMessage = await this.savedMessages.find(args.messageId);
    if (!savedMessage) {
      msg.channel.createMessage(errorMessage("Unknown message"));
      return;
    }

    const channel = await this.guild.channels.get(savedMessage.channel_id);
    if (!channel || !(channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel no longer exists"));
      return;
    }

    const targetMessage = await channel.getMessage(args.messageId);
    if (!targetMessage) {
      msg.channel.createMessage(errorMessage("Unknown message (2)"));
      return;
    }

    // Clear old reaction roles for the message from the DB
    await this.reactionRoles.removeFromMessage(targetMessage.id);

    // Turn "emoji = role" pairs into an array of tuples of the form [emoji, roleId]
    // Emoji is either a unicode emoji or the snowflake of a custom emoji
    const emojiRolePairs: ReactionRolePair[] = args.reactionRolePairs
      .trim()
      .split("\n")
      .map(v => v.split("=").map(v => v.trim())) // tslint:disable-line
      .map(
        (pair): ReactionRolePair => {
          const customEmojiMatch = pair[0].match(/^<a?:(.*?):(\d+)>$/);
          if (customEmojiMatch) {
            return [customEmojiMatch[2], pair[1], customEmojiMatch[1]];
          } else {
            return pair as ReactionRolePair;
          }
        },
      );

    // Verify the specified emojis and roles are valid and usable
    for (const pair of emojiRolePairs) {
      if (pair[0] === CLEAR_ROLES_EMOJI) {
        msg.channel.createMessage(
          errorMessage(`The emoji for clearing roles (${CLEAR_ROLES_EMOJI}) is reserved and cannot be used`),
        );
        return;
      }

      if (!this.canUseEmoji(pair[0])) {
        msg.channel.createMessage(errorMessage("I can only use regular emojis and custom emojis from servers I'm on"));
        return;
      }

      if (!this.guild.roles.has(pair[1])) {
        msg.channel.createMessage(errorMessage(`Unknown role ${pair[1]}`));
        return;
      }
    }

    // Save the new reaction roles to the database
    for (const pair of emojiRolePairs) {
      await this.reactionRoles.add(channel.id, targetMessage.id, pair[0], pair[1]);
    }

    // Apply the reactions themselves
    const reactionRoles = await this.reactionRoles.getForMessage(targetMessage.id);
    await this.applyReactionRoleReactionsToMessage(targetMessage.channel.id, targetMessage.id, reactionRoles);

    msg.channel.createMessage(successMessage("Reaction roles added"));
  }

  /**
   * When a reaction is added to a message with reaction roles, see which role that reaction matches (if any) and queue
   * those role changes for the member. Multiple role changes in rapid succession are batched and applied at once.
   * Reacting with CLEAR_ROLES_EMOJI will queue a removal of all roles granted by this message's reaction roles.
   */
  @d.event("messageReactionAdd")
  async onAddReaction(msg: Message, emoji: CustomEmoji, userId: string) {
    // Make sure this message has reaction roles on it
    const reactionRoles = await this.reactionRoles.getForMessage(msg.id);
    if (reactionRoles.length === 0) return;

    const member = this.guild.members.get(userId);
    if (!member) return;

    if (emoji.name === CLEAR_ROLES_EMOJI) {
      // User reacted with "clear roles" emoji -> clear their roles
      const reactionRoleRoleIds = reactionRoles.map(rr => rr.role_id);
      for (const roleId of reactionRoleRoleIds) {
        this.addMemberPendingRoleChange(userId, "-", roleId);
      }

      this.reactionRemoveQueue.add(async () => {
        await msg.channel.removeMessageReaction(msg.id, CLEAR_ROLES_EMOJI, userId);
      });
    } else {
      // User reacted with a reaction role emoji -> add the role
      const matchingReactionRole = await this.reactionRoles.getByMessageAndEmoji(msg.id, emoji.id || emoji.name);
      if (!matchingReactionRole) return;

      this.addMemberPendingRoleChange(userId, "+", matchingReactionRole.role_id);
    }

    // Remove the reaction after a small delay
    setTimeout(() => {
      this.reactionRemoveQueue.add(async () => {
        const reaction = emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;
        const wait = sleep(1500);
        await msg.channel.removeMessageReaction(msg.id, reaction, userId).catch(noop);
        await wait;
      });
    }, 1500);
  }
}
