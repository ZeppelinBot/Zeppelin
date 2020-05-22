import { Member, Message, TextChannel, User } from "eris";
import { GuildCases } from "../data/GuildCases";
import moment from "moment-timezone";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { GuildMutes } from "../data/GuildMutes";
import {
  chunkMessageLines,
  DBDateFormat,
  errorMessage,
  UserNotificationResult,
  noop,
  notifyUser,
  stripObjectToScalars,
  successMessage,
  tNullable,
  ucfirst,
  UnknownUser,
  UserNotificationMethod,
  trimLines,
  MINUTES,
} from "../utils";
import humanizeDuration from "humanize-duration";
import { LogType } from "../data/LogType";
import { GuildLogs } from "../data/GuildLogs";
import { decorators as d, IPluginOptions, logger } from "knub";
import { Mute } from "../data/entities/Mute";
import { renderTemplate } from "../templateFormatter";
import { CaseTypes } from "../data/CaseTypes";
import { CaseArgs, CasesPlugin } from "./Cases";
import { Case } from "../data/entities/Case";
import * as t from "io-ts";
import { ERRORS, RecoverablePluginError } from "../RecoverablePluginError";
import { GuildArchives } from "src/data/GuildArchives";
import { humanizeDurationShort } from "../humanizeDurationShort";

const ConfigSchema = t.type({
  mute_role: tNullable(t.string),
  move_to_voice_channel: tNullable(t.string),

  dm_on_mute: t.boolean,
  dm_on_update: t.boolean,
  message_on_mute: t.boolean,
  message_on_update: t.boolean,
  message_channel: tNullable(t.string),
  mute_message: tNullable(t.string),
  timed_mute_message: tNullable(t.string),
  update_mute_message: tNullable(t.string),

  can_view_list: t.boolean,
  can_cleanup: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

interface IMuteWithDetails extends Mute {
  member?: Member;
  banned?: boolean;
}

export type MuteResult = {
  case: Case;
  notifyResult: UserNotificationResult;
  updatedExistingMute: boolean;
};

export type UnmuteResult = {
  case: Case;
};

export interface MuteOptions {
  caseArgs?: Partial<CaseArgs>;
  contactMethods?: UserNotificationMethod[];
}

const EXPIRED_MUTE_CHECK_INTERVAL = 60 * 1000;
let FIRST_CHECK_TIME = Date.now();
const FIRST_CHECK_INCREMENT = 5 * 1000;

export class MutesPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "mutes";
  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Mutes",
  };

  protected mutes: GuildMutes;
  protected cases: GuildCases;
  protected serverLogs: GuildLogs;
  private muteClearIntervalId: NodeJS.Timer;
  archives: GuildArchives;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        mute_role: null,
        move_to_voice_channel: null,

        dm_on_mute: false,
        dm_on_update: false,
        message_on_mute: false,
        message_on_update: false,
        message_channel: null,
        mute_message: "You have been muted on the {guildName} server. Reason given: {reason}",
        timed_mute_message: "You have been muted on the {guildName} server for {time}. Reason given: {reason}",
        update_mute_message: "Your mute on the {guildName} server has been updated to {time}.",

        can_view_list: false,
        can_cleanup: false,
      },
      overrides: [
        {
          level: ">=50",
          config: {
            can_view_list: true,
          },
        },
        {
          level: ">=100",
          config: {
            can_cleanup: true,
          },
        },
      ],
    };
  }

  protected onLoad() {
    this.mutes = GuildMutes.getGuildInstance(this.guildId);
    this.cases = GuildCases.getGuildInstance(this.guildId);
    this.serverLogs = new GuildLogs(this.guildId);
    this.archives = GuildArchives.getGuildInstance(this.guildId);

    // Check for expired mutes every 5s
    const firstCheckTime = Math.max(Date.now(), FIRST_CHECK_TIME) + FIRST_CHECK_INCREMENT;
    FIRST_CHECK_TIME = firstCheckTime;

    setTimeout(() => {
      this.clearExpiredMutes();
      this.muteClearIntervalId = setInterval(() => this.clearExpiredMutes(), EXPIRED_MUTE_CHECK_INTERVAL);
    }, firstCheckTime - Date.now());
  }

  protected onUnload() {
    clearInterval(this.muteClearIntervalId);
  }

  public async muteUser(
    userId: string,
    muteTime: number = null,
    reason: string = null,
    muteOptions: MuteOptions = {},
  ): Promise<MuteResult> {
    const muteRole = this.getConfig().mute_role;
    if (!muteRole) {
      this.throwRecoverablePluginError(ERRORS.NO_MUTE_ROLE_IN_CONFIG);
    }

    const timeUntilUnmute = muteTime ? humanizeDuration(muteTime) : "indefinite";

    // No mod specified -> mark Zeppelin as the mod
    if (!muteOptions.caseArgs?.modId) {
      muteOptions.caseArgs = muteOptions.caseArgs ?? {};
      muteOptions.caseArgs.modId = this.bot.user.id;
    }

    const user = await this.resolveUser(userId);
    const member = await this.getMember(user.id, true); // Grab the fresh member so we don't have stale role info
    const config = this.getMatchingConfig({ member, userId });

    if (member) {
      // Apply mute role if it's missing
      if (!member.roles.includes(muteRole)) {
        await member.addRole(muteRole);
      }

      // If enabled, move the user to the mute voice channel (e.g. afk - just to apply the voice perms from the mute role)
      const moveToVoiceChannelId = this.getConfig().move_to_voice_channel;
      if (moveToVoiceChannelId) {
        // TODO: Add back the voiceState check once we figure out how to get voice state for guild members that are loaded on-demand
        try {
          await member.edit({ channelID: moveToVoiceChannelId });
        } catch (e) {} // tslint:disable-line
      }
    }

    // If the user is already muted, update the duration of their existing mute
    const existingMute = await this.mutes.findExistingMuteForUserId(user.id);
    let notifyResult: UserNotificationResult = { method: null, success: true };

    if (existingMute) {
      await this.mutes.updateExpiryTime(user.id, muteTime);
    } else {
      await this.mutes.addMute(user.id, muteTime);
    }

    const template = existingMute
      ? config.update_mute_message
      : muteTime
      ? config.timed_mute_message
      : config.mute_message;

    const muteMessage =
      template &&
      (await renderTemplate(template, {
        guildName: this.guild.name,
        reason: reason || "None",
        time: timeUntilUnmute,
      }));

    if (muteMessage && user instanceof User) {
      let contactMethods = [];

      if (muteOptions?.contactMethods) {
        contactMethods = muteOptions.contactMethods;
      } else {
        const useDm = existingMute ? config.dm_on_update : config.dm_on_mute;
        if (useDm) {
          contactMethods.push({ type: "dm" });
        }

        const useChannel = existingMute ? config.message_on_update : config.message_on_mute;
        const channel = config.message_channel && this.guild.channels.get(config.message_channel);
        if (useChannel && channel instanceof TextChannel) {
          contactMethods.push({ type: "channel", channel });
        }
      }

      notifyResult = await notifyUser(user, muteMessage, contactMethods);
    }

    // Create/update a case
    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    let theCase;

    if (existingMute && existingMute.case_id) {
      // Update old case
      // Since mutes can often have multiple notes (extraNotes), we won't post each case note individually,
      // but instead we'll post the entire case afterwards
      theCase = await this.cases.find(existingMute.case_id);
      const noteDetails = [`Mute updated to ${muteTime ? timeUntilUnmute : "indefinite"}`];
      const reasons = [reason, ...(muteOptions.caseArgs?.extraNotes || [])];
      for (const noteReason of reasons) {
        await casesPlugin.createCaseNote({
          caseId: existingMute.case_id,
          modId: muteOptions.caseArgs?.modId,
          body: noteReason,
          noteDetails,
          postInCaseLogOverride: false,
        });
      }

      if (muteOptions.caseArgs?.postInCaseLogOverride !== false) {
        casesPlugin.postCaseToCaseLogChannel(existingMute.case_id);
      }
    } else {
      // Create new case
      const noteDetails = [`Muted ${muteTime ? `for ${timeUntilUnmute}` : "indefinitely"}`];
      if (notifyResult.text) {
        noteDetails.push(ucfirst(notifyResult.text));
      }

      theCase = await casesPlugin.createCase({
        ...(muteOptions.caseArgs || {}),
        userId,
        modId: muteOptions.caseArgs?.modId,
        type: CaseTypes.Mute,
        reason,
        noteDetails,
      });
      await this.mutes.setCaseId(user.id, theCase.id);
    }

    // Log the action
    const mod = await this.resolveUser(muteOptions.caseArgs?.modId);
    if (muteTime) {
      this.serverLogs.log(LogType.MEMBER_TIMED_MUTE, {
        mod: stripObjectToScalars(mod),
        user: stripObjectToScalars(user),
        time: timeUntilUnmute,
      });
    } else {
      this.serverLogs.log(LogType.MEMBER_MUTE, {
        mod: stripObjectToScalars(mod),
        user: stripObjectToScalars(user),
      });
    }

    return {
      case: theCase,
      notifyResult,
      updatedExistingMute: !!existingMute,
    };
  }

  public async unmuteUser(
    userId: string,
    unmuteTime: number = null,
    caseArgs: Partial<CaseArgs> = {},
  ): Promise<UnmuteResult> {
    const existingMute = await this.mutes.findExistingMuteForUserId(userId);
    const user = await this.resolveUser(userId);
    const member = await this.getMember(userId, true); // Grab the fresh member so we don't have stale role info

    if (!existingMute && !this.hasMutedRole(member)) return;

    if (unmuteTime) {
      // Schedule timed unmute (= just set the mute's duration)
      if (!existingMute) {
        await this.mutes.addMute(userId, unmuteTime);
      } else {
        await this.mutes.updateExpiryTime(userId, unmuteTime);
      }
    } else {
      // Unmute immediately
      if (member) {
        const muteRole = this.getConfig().mute_role;
        if (member.roles.includes(muteRole)) {
          await member.removeRole(muteRole);
        }
      } else {
        logger.warn(
          `Member ${userId} not found in guild ${this.guild.name} (${this.guildId}) when attempting to unmute`,
        );
      }
      if (existingMute) {
        await this.mutes.clear(userId);
      }
    }

    const timeUntilUnmute = unmuteTime && humanizeDuration(unmuteTime);

    // Create a case
    const noteDetails = [];
    if (unmuteTime) {
      noteDetails.push(`Scheduled unmute in ${timeUntilUnmute}`);
    } else {
      noteDetails.push(`Unmuted immediately`);
    }
    if (!existingMute) {
      noteDetails.push(`Removed external mute`);
    }

    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const createdCase = await casesPlugin.createCase({
      ...caseArgs,
      userId,
      modId: caseArgs.modId,
      type: CaseTypes.Unmute,
      noteDetails,
    });

    // Log the action
    const mod = this.bot.users.get(caseArgs.modId);
    if (unmuteTime) {
      this.serverLogs.log(LogType.MEMBER_TIMED_UNMUTE, {
        mod: stripObjectToScalars(mod),
        user: stripObjectToScalars(user),
        time: timeUntilUnmute,
      });
    } else {
      this.serverLogs.log(LogType.MEMBER_UNMUTE, {
        mod: stripObjectToScalars(mod),
        user: stripObjectToScalars(user),
      });
    }

    return {
      case: createdCase,
    };
  }

  public hasMutedRole(member: Member) {
    if (member.roles.includes(this.getConfig().mute_role)) {
      return true;
    }
    return false;
  }

  @d.command("mutes", [], {
    options: [
      {
        name: "age",
        shortcut: "a",
        type: "delay",
      },
      {
        name: "left",
        shortcut: "l",
        isSwitch: true,
      },
      {
        name: "manual",
        shortcut: "m",
        isSwitch: true,
      },
      {
        name: "export",
        shortcut: "e",
        isSwitch: true,
      },
    ],
  })
  @d.permission("can_view_list")
  protected async muteListCmd(
    msg: Message,
    args: { age?: number; left?: boolean; manual?: boolean; export?: boolean },
  ) {
    const listMessagePromise = msg.channel.createMessage("Loading mutes...");
    const mutesPerPage = 10;
    let totalMutes = 0;
    let hasFilters = false;

    let hasReactions = false;
    let clearReactionsFn;
    let clearReactionsTimeout;
    const clearReactionsDebounce = 5 * MINUTES;

    let lines = [];

    // Active, logged mutes
    const activeMutes = await this.mutes.getActiveMutes();
    activeMutes.sort((a, b) => {
      if (a.expires_at == null && b.expires_at != null) return 1;
      if (b.expires_at == null && a.expires_at != null) return -1;
      if (a.expires_at == null && b.expires_at == null) {
        return a.created_at > b.created_at ? -1 : 1;
      }
      return a.expires_at > b.expires_at ? 1 : -1;
    });

    if (args.manual) {
      // Show only manual mutes (i.e. "Muted" role added without a logged mute)
      const muteUserIds = new Set(activeMutes.map(m => m.user_id));
      const manuallyMutedMembers = [];
      const muteRole = this.getConfig().mute_role;

      if (muteRole) {
        this.guild.members.forEach(member => {
          if (muteUserIds.has(member.id)) return;
          if (member.roles.includes(muteRole)) manuallyMutedMembers.push(member);
        });
      }

      totalMutes = manuallyMutedMembers.length;

      lines = manuallyMutedMembers.map(member => {
        return `<@!${member.id}> (**${member.user.username}#${member.user.discriminator}**, \`${member.id}\`)   🔧 Manual mute`;
      });
    } else {
      // Show filtered active mutes (but not manual mutes)
      let filteredMutes: IMuteWithDetails[] = activeMutes;
      let bannedIds: string[] = null;

      // Filter: mute age
      if (args.age) {
        const cutoff = moment()
          .subtract(args.age, "ms")
          .format(DBDateFormat);
        filteredMutes = filteredMutes.filter(m => m.created_at <= cutoff);
        hasFilters = true;
      }

      // Fetch some extra details for each mute: the muted member, and whether they've been banned
      for (const [index, mute] of filteredMutes.entries()) {
        const muteWithDetails = { ...mute };

        const member = await this.getMember(mute.user_id);

        if (!member) {
          if (!bannedIds) {
            const bans = await this.guild.getBans();
            bannedIds = bans.map(u => u.user.id);
          }

          muteWithDetails.banned = bannedIds.includes(mute.user_id);
        } else {
          muteWithDetails.member = member;
        }

        filteredMutes[index] = muteWithDetails;
      }

      // Filter: left the server
      if (args.left != null) {
        filteredMutes = filteredMutes.filter(m => (args.left && !m.member) || (!args.left && m.member));
        hasFilters = true;
      }

      totalMutes = filteredMutes.length;

      // Create a message line for each mute
      const caseIds = filteredMutes.map(m => m.case_id).filter(v => !!v);
      const muteCases = caseIds.length ? await this.cases.get(caseIds) : [];
      const muteCasesById = muteCases.reduce((map, c) => map.set(c.id, c), new Map());

      lines = filteredMutes.map(mute => {
        const user = this.bot.users.get(mute.user_id);
        const username = user ? `${user.username}#${user.discriminator}` : "Unknown#0000";
        const theCase = muteCasesById.get(mute.case_id);
        const caseName = theCase ? `Case #${theCase.case_number}` : "No case";

        let line = `<@!${mute.user_id}> (**${username}**, \`${mute.user_id}\`)   📋 ${caseName}`;

        if (mute.expires_at) {
          const timeUntilExpiry = moment().diff(moment(mute.expires_at, DBDateFormat));
          const humanizedTime = humanizeDurationShort(timeUntilExpiry, { largest: 2, round: true });
          line += `   ⏰ Expires in ${humanizedTime}`;
        } else {
          line += `   ⏰ Indefinite`;
        }

        const timeFromMute = moment(mute.created_at, DBDateFormat).diff(moment());
        const humanizedTimeFromMute = humanizeDurationShort(timeFromMute, { largest: 2, round: true });
        line += `   🕒 Muted ${humanizedTimeFromMute} ago`;

        if (mute.banned) {
          line += `   🔨 Banned`;
        } else if (!mute.member) {
          line += `   ❌ Left server`;
        }

        return line;
      });
    }

    const originalLines = Array.from(lines);
    for (let i = 0; i < 20; i++) {
      lines = [...lines, ...originalLines];
    }
    totalMutes = lines.length;

    const listMessage = await listMessagePromise;

    let currentPage = 1;
    const totalPages = Math.ceil(lines.length / mutesPerPage);

    const drawListPage = async page => {
      page = Math.max(1, Math.min(totalPages, page));
      currentPage = page;

      const pageStart = (page - 1) * mutesPerPage;
      const pageLines = lines.slice(pageStart, pageStart + mutesPerPage);

      const pageRangeText = `${pageStart + 1}–${pageStart + pageLines.length} of ${totalMutes}`;

      let message;
      if (args.manual) {
        message = `Showing manual mutes ${pageRangeText}:`;
      } else if (hasFilters) {
        message = `Showing filtered active mutes ${pageRangeText}:`;
      } else {
        message = `Showing active mutes ${pageRangeText}:`;
      }

      message += "\n\n" + pageLines.join("\n");

      listMessage.edit(message);
      bumpClearReactionsTimeout();
    };

    const bumpClearReactionsTimeout = () => {
      if (!hasReactions) return;
      clearTimeout(clearReactionsTimeout);
      clearReactionsTimeout = setTimeout(clearReactionsFn, clearReactionsDebounce);
    };

    if (totalMutes === 0) {
      if (args.manual) {
        listMessage.edit("No manual mutes found!");
      } else if (hasFilters) {
        listMessage.edit("No mutes found with the specified filters!");
      } else {
        listMessage.edit("No active mutes!");
      }
    } else if (args.export) {
      const archiveId = await this.archives.create(lines.join("\n"), moment().add(1, "hour"));
      const url = await this.archives.getUrl(this.knub.getGlobalConfig().url, archiveId);

      await listMessage.edit(`Exported mutes: ${url}`);
    } else {
      drawListPage(1);

      if (totalPages > 1) {
        hasReactions = true;
        listMessage.addReaction("⬅");
        listMessage.addReaction("➡");

        const removeListenerFn = this.on("messageReactionAdd", (rMsg: Message, emoji, userId) => {
          if (rMsg.id !== listMessage.id) return;
          if (userId !== msg.author.id) return;
          if (!["⬅", "➡"].includes(emoji.name)) return;

          if (emoji.name === "⬅" && currentPage > 1) {
            drawListPage(currentPage - 1);
          } else if (emoji.name === "➡" && currentPage < totalPages) {
            drawListPage(currentPage + 1);
          }

          rMsg.removeReaction(emoji.name, userId).catch(noop);
        });

        clearReactionsFn = () => {
          listMessage.removeReactions().catch(noop);
          removeListenerFn();
        };
        bumpClearReactionsTimeout();
      }
    }
  }

  /**
   * Reapply active mutes on join
   */
  @d.event("guildMemberAdd")
  protected async onGuildMemberAdd(_, member: Member) {
    const mute = await this.mutes.findExistingMuteForUserId(member.id);
    if (mute) {
      const muteRole = this.getConfig().mute_role;
      await member.addRole(muteRole);

      this.serverLogs.log(LogType.MEMBER_MUTE_REJOIN, {
        member: stripObjectToScalars(member, ["user", "roles"]),
      });
    }
  }

  /**
   * Clear active mute from the member if the member is banned
   */
  @d.event("guildBanAdd")
  protected async onGuildBanAdd(_, user: User) {
    const mute = await this.mutes.findExistingMuteForUserId(user.id);
    if (mute) {
      this.mutes.clear(user.id);
    }
  }

  /**
   * COMMAND: Clear dangling mutes for members who have been banned
   */
  @d.command("clear_banned_mutes")
  @d.permission("can_cleanup")
  protected async clearBannedMutesCmd(msg: Message) {
    await msg.channel.createMessage("Clearing mutes from banned users...");

    const activeMutes = await this.mutes.getActiveMutes();

    // Mismatch in Eris docs and actual result here, based on Eris's code comments anyway
    const bans: Array<{ reason: string; user: User }> = (await this.guild.getBans()) as any;
    const bannedIds = bans.map(b => b.user.id);

    await msg.channel.createMessage(
      `Found ${activeMutes.length} mutes and ${bannedIds.length} bans, cross-referencing...`,
    );

    let cleared = 0;
    for (const mute of activeMutes) {
      if (bannedIds.includes(mute.user_id)) {
        await this.mutes.clear(mute.user_id);
        cleared++;
      }
    }

    this.sendSuccessMessage(msg.channel, `Cleared ${cleared} mutes from banned users!`);
  }

  /**
   * Clear active mute from the member if the mute role is removed
   */
  @d.event("guildMemberUpdate")
  protected async onGuildMemberUpdate(_, member: Member) {
    const muteRole = this.getConfig().mute_role;
    if (!muteRole) return;

    const mute = await this.mutes.findExistingMuteForUserId(member.id);
    if (!mute) return;

    if (!member.roles.includes(muteRole)) {
      await this.mutes.clear(muteRole);
    }
  }

  /**
   * COMMAND: Clear dangling mutes for members whose mute role was removed by other means
   */
  @d.command("clear_mutes_without_role")
  @d.permission("can_cleanup")
  protected async clearMutesWithoutRoleCmd(msg: Message) {
    const activeMutes = await this.mutes.getActiveMutes();
    const muteRole = this.getConfig().mute_role;
    if (!muteRole) return;

    await msg.channel.createMessage("Clearing mutes from members that don't have the mute role...");

    let cleared = 0;
    for (const mute of activeMutes) {
      const member = await this.getMember(mute.user_id);
      if (!member) continue;

      if (!member.roles.includes(muteRole)) {
        await this.mutes.clear(mute.user_id);
        cleared++;
      }
    }

    this.sendSuccessMessage(msg.channel, `Cleared ${cleared} mutes from members that don't have the mute role`);
  }

  @d.command("clear_mute", "<userIds:string...>")
  @d.permission("can_cleanup")
  protected async clearMuteCmd(msg: Message, args: { userIds: string[] }) {
    const failed = [];
    for (const id of args.userIds) {
      const mute = await this.mutes.findExistingMuteForUserId(id);
      if (!mute) {
        failed.push(id);
        continue;
      }
      await this.mutes.clear(id);
    }

    if (failed.length !== args.userIds.length) {
      this.sendSuccessMessage(msg.channel, `**${args.userIds.length - failed.length} active mute(s) cleared**`);
    }

    if (failed.length) {
      this.sendErrorMessage(
        msg.channel,
        `**${failed.length}/${args.userIds.length} IDs failed**, they are not muted: ${failed.join(" ")}`,
      );
    }
  }

  protected async clearExpiredMutes() {
    const expiredMutes = await this.mutes.getExpiredMutes();
    for (const mute of expiredMutes) {
      const member = await this.getMember(mute.user_id);

      if (member) {
        try {
          await member.removeRole(this.getConfig().mute_role);
        } catch (e) {
          this.serverLogs.log(LogType.BOT_ALERT, {
            body: `Failed to remove mute role from {userMention(member)}`,
            member: stripObjectToScalars(member),
          });
        }
      }

      await this.mutes.clear(mute.user_id);

      this.serverLogs.log(LogType.MEMBER_MUTE_EXPIRED, {
        member: member
          ? stripObjectToScalars(member, ["user", "roles"])
          : { id: mute.user_id, user: new UnknownUser({ id: mute.user_id }) },
      });
    }
  }
}
