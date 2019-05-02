import { Member, Message, User } from "eris";
import { GuildCases } from "../data/GuildCases";
import moment from "moment-timezone";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { GuildMutes } from "../data/GuildMutes";
import {
  chunkMessageLines,
  DBDateFormat,
  errorMessage,
  INotifyUserResult,
  notifyUser,
  NotifyUserStatus,
  stripObjectToScalars,
  successMessage,
  ucfirst,
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

interface IMuteWithDetails extends Mute {
  member?: Member;
  banned?: boolean;
}

interface IMutesPluginConfig {
  mute_role: string;
  move_to_voice_channel: string;

  dm_on_mute: boolean;
  message_on_mute: boolean;
  message_channel: string;
  mute_message: string;
  timed_mute_message: string;

  can_view_list: boolean;
  can_cleanup: boolean;
}

export type MuteResult = {
  case: Case;
  notifyResult: INotifyUserResult;
  updatedExistingMute: boolean;
};

export type UnmuteResult = {
  case: Case;
};

export class MutesPlugin extends ZeppelinPlugin<IMutesPluginConfig> {
  public static pluginName = "mutes";

  protected mutes: GuildMutes;
  protected cases: GuildCases;
  protected serverLogs: GuildLogs;
  private muteClearIntervalId: NodeJS.Timer;

  getDefaultOptions(): IPluginOptions<IMutesPluginConfig> {
    return {
      config: {
        mute_role: null,
        move_to_voice_channel: null,

        dm_on_mute: false,
        message_on_mute: false,
        message_channel: null,
        mute_message: "You have been muted on {guildName}. Reason given: {reason}",
        timed_mute_message: "You have been muted on {guildName} for {time}. Reason given: {reason}",

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
    this.mutes = GuildMutes.getInstance(this.guildId);
    this.cases = GuildCases.getInstance(this.guildId);
    this.serverLogs = new GuildLogs(this.guildId);

    // Check for expired mutes every 5s
    this.clearExpiredMutes();
    this.muteClearIntervalId = setInterval(() => this.clearExpiredMutes(), 5000);
  }

  protected onUnload() {
    clearInterval(this.muteClearIntervalId);
  }

  public async muteUser(
    userId: string,
    muteTime: number = null,
    reason: string = null,
    caseArgs: Partial<CaseArgs> = {},
  ): Promise<MuteResult> {
    const muteRole = this.getConfig().mute_role;
    if (!muteRole) return;

    const timeUntilUnmute = muteTime && humanizeDuration(muteTime);

    // No mod specified -> mark Zeppelin as the mod
    if (!caseArgs.modId) {
      caseArgs.modId = this.bot.user.id;
    }

    const user = await this.resolveUser(userId);
    const member = await this.getMember(user.id);

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
    let notifyResult: INotifyUserResult = { status: NotifyUserStatus.Ignored };

    if (existingMute) {
      await this.mutes.updateExpiryTime(user.id, muteTime);
    } else {
      await this.mutes.addMute(user.id, muteTime);

      // If it's a new mute, attempt to message the user
      const config = this.getMatchingConfig({ member, userId });
      const template = muteTime ? config.timed_mute_message : config.mute_message;

      const muteMessage =
        template &&
        (await renderTemplate(template, {
          guildName: this.guild.name,
          reason,
          time: timeUntilUnmute,
        }));

      if (reason && muteMessage) {
        if (user instanceof User) {
          notifyResult = await notifyUser(this.bot, this.guild, user, muteMessage, {
            useDM: config.dm_on_mute,
            useChannel: config.message_on_mute,
            channelId: config.message_channel,
          });
        } else {
          notifyResult = { status: NotifyUserStatus.Failed };
        }
      }
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
      const reasons = [reason, ...(caseArgs.extraNotes || [])];
      for (const noteReason of reasons) {
        await casesPlugin.createCaseNote({
          caseId: existingMute.case_id,
          modId: caseArgs.modId,
          body: noteReason,
          noteDetails,
          postInCaseLogOverride: false,
        });
      }

      if (caseArgs.postInCaseLogOverride !== false) {
        casesPlugin.postCaseToCaseLogChannel(existingMute.case_id);
      }
    } else {
      // Create new case
      const noteDetails = [`Muted ${muteTime ? `for ${timeUntilUnmute}` : "indefinitely"}`];
      if (notifyResult.status !== NotifyUserStatus.Ignored) {
        noteDetails.push(ucfirst(notifyResult.text));
      }

      theCase = await casesPlugin.createCase({
        ...caseArgs,
        userId,
        modId: caseArgs.modId,
        type: CaseTypes.Mute,
        reason,
        noteDetails,
      });
      await this.mutes.setCaseId(user.id, theCase.id);
    }

    // Log the action
    const mod = await this.resolveUser(caseArgs.modId);
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
    if (!existingMute) return;

    const user = await this.resolveUser(userId);
    const member = await this.getMember(userId);

    if (unmuteTime) {
      // Schedule timed unmute (= just set the mute's duration)
      await this.mutes.updateExpiryTime(userId, unmuteTime);
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

      await this.mutes.clear(userId);
    }

    const timeUntilUnmute = unmuteTime && humanizeDuration(unmuteTime);

    // Create a case
    const noteDetails = [];
    if (unmuteTime) {
      noteDetails.push(`Scheduled unmute in ${timeUntilUnmute}`);
    } else {
      noteDetails.push(`Unmuted immediately`);
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

  @d.command("mutes", [], {
    options: [{ name: "age", type: "delay" }, { name: "left", type: "boolean" }],
  })
  @d.permission("can_view_list")
  protected async muteListCmd(msg: Message, args: { age?: number; left?: boolean }) {
    const lines = [];

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

    let filteredMutes: IMuteWithDetails[] = activeMutes;
    let hasFilters = false;
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
          bannedIds = bans.map(u => u.id);
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

    // Mute count
    let totalMutes = filteredMutes.length;

    // Create a message lines for each mute
    const caseIds = filteredMutes.map(m => m.case_id).filter(v => !!v);
    const muteCases = caseIds.length ? await this.cases.get(caseIds) : [];
    const muteCasesById = muteCases.reduce((map, c) => map.set(c.id, c), new Map());

    for (const mute of filteredMutes) {
      const user = this.bot.users.get(mute.user_id);
      const username = user ? `${user.username}#${user.discriminator}` : "Unknown#0000";
      const theCase = muteCasesById.get(mute.case_id);
      const caseName = theCase ? `Case #${theCase.case_number}` : "No case";

      let line = `<@!${mute.user_id}> (**${username}**, \`${mute.user_id}\`)   📋 ${caseName}`;

      if (mute.expires_at) {
        const timeUntilExpiry = moment().diff(moment(mute.expires_at, DBDateFormat));
        const humanizedTime = humanizeDuration(timeUntilExpiry, { largest: 2, round: true });
        line += `   ⏰ Expires in ${humanizedTime}`;
      } else {
        line += `   ⏰ Doesn't expire`;
      }

      const timeFromMute = moment(mute.created_at, DBDateFormat).diff(moment());
      const humanizedTimeFromMute = humanizeDuration(timeFromMute, { largest: 2, round: true });
      line += `   🕒 Muted ${humanizedTimeFromMute} ago`;

      if (mute.banned) {
        line += `   🔨 User was banned`;
      } else if (!mute.member) {
        line += `   ❌ Has left the server`;
      }

      lines.push(line);
    }

    // Find manually added mute roles and create a mesage line for each (but only if no filters have been specified)
    if (!hasFilters) {
      const muteUserIds = activeMutes.reduce((set, m) => set.add(m.user_id), new Set());
      const manuallyMutedMembers = [];
      const muteRole = this.getConfig().mute_role;

      if (muteRole) {
        this.guild.members.forEach(member => {
          if (muteUserIds.has(member.id)) return;
          if (member.roles.includes(muteRole)) manuallyMutedMembers.push(member);
        });
      }

      totalMutes += manuallyMutedMembers.length;

      lines.push(
        ...manuallyMutedMembers.map(member => {
          return `<@!${member.id}> (**${member.user.username}#${member.user.discriminator}**, \`${
            member.id
          }\`)   🔧 Manual mute`;
        }),
      );
    }

    let message;
    if (totalMutes > 0) {
      message = hasFilters
        ? `Results (${totalMutes} total):\n\n${lines.join("\n")}`.trim()
        : `Active mutes (${totalMutes} total):\n\n${lines.join("\n")}`.trim();
    } else {
      message = hasFilters ? "No mutes found with the specified filters!" : "No active mutes!";
    }

    const chunks = chunkMessageLines(message);
    for (const chunk of chunks) {
      msg.channel.createMessage(chunk);
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
        member: stripObjectToScalars(member, ["user"]),
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

    msg.channel.createMessage(successMessage(`Cleared ${cleared} mutes from banned users!`));
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

    msg.channel.createMessage(successMessage(`Cleared ${cleared} mutes from members that don't have the mute role`));
  }

  @d.command("clear_mute", "<userId:string>")
  @d.permission("can_cleanup")
  protected async clearMuteCmd(msg: Message, args: { userId: string }) {
    const mute = await this.mutes.findExistingMuteForUserId(args.userId);
    if (!mute) {
      msg.channel.createMessage(errorMessage("No active mutes found for that user id"));
      return;
    }

    await this.mutes.clear(args.userId);
    msg.channel.createMessage(successMessage(`Active mute cleared`));
  }

  protected async clearExpiredMutes() {
    const expiredMutes = await this.mutes.getExpiredMutes();
    for (const mute of expiredMutes) {
      const member = await this.getMember(mute.user_id);
      if (!member) continue;

      try {
        await member.removeRole(this.getConfig().mute_role);
      } catch (e) {} // tslint:disable-line

      await this.mutes.clear(member.id);

      this.serverLogs.log(LogType.MEMBER_MUTE_EXPIRED, {
        member: stripObjectToScalars(member, ["user"]),
      });
    }
  }
}
