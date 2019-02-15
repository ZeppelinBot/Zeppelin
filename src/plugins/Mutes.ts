import { Member, Message, TextableChannel, User } from "eris";
import { GuildCases } from "../data/GuildCases";
import moment from "moment-timezone";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { GuildActions } from "../data/GuildActions";
import { GuildMutes } from "../data/GuildMutes";
import { DBDateFormat, chunkMessageLines, stripObjectToScalars, successMessage, errorMessage } from "../utils";
import humanizeDuration from "humanize-duration";
import { LogType } from "../data/LogType";
import { GuildLogs } from "../data/GuildLogs";
import { decorators as d } from "knub";

export class MutesPlugin extends ZeppelinPlugin {
  public static pluginName = "mutes";

  protected actions: GuildActions;
  protected mutes: GuildMutes;
  protected cases: GuildCases;
  protected serverLogs: GuildLogs;
  private muteClearIntervalId: NodeJS.Timer;

  getDefaultOptions() {
    return {
      config: {
        mute_role: null,
      },
      permissions: {
        view_list: false,
        cleanup: false,
      },
      overrides: [
        {
          level: ">=50",
          permissions: {
            view_list: true,
          },
        },
        {
          level: ">=100",
          permissions: {
            cleanup: true,
          },
        },
      ],
    };
  }

  onLoad() {
    this.actions = GuildActions.getInstance(this.guildId);
    this.mutes = GuildMutes.getInstance(this.guildId);
    this.cases = GuildCases.getInstance(this.guildId);
    this.serverLogs = new GuildLogs(this.guildId);

    this.actions.register("mute", args => {
      return this.muteMember(args.member, args.muteTime);
    });
    this.actions.register("unmute", args => {
      return this.unmuteMember(args.member, args.unmuteTime);
    });

    // Check for expired mutes every 5s
    this.clearExpiredMutes();
    this.muteClearIntervalId = setInterval(() => this.clearExpiredMutes(), 5000);
  }

  onUnload() {
    this.actions.unregister("mute");
    this.actions.unregister("unmute");

    clearInterval(this.muteClearIntervalId);
  }

  public async muteMember(member: Member, muteTime: number = null) {
    const muteRole = this.configValue("mute_role");
    if (!muteRole) return;

    await member.addRole(muteRole);
    return this.mutes.addOrUpdateMute(member.id, muteTime);
  }

  public async unmuteMember(member: Member, unmuteTime: number = null) {
    if (unmuteTime) {
      await this.mutes.addOrUpdateMute(member.id, unmuteTime);
    } else {
      const muteRole = this.configValue("mute_role");
      if (member.roles.includes(muteRole)) {
        await member.removeRole(this.configValue("mute_role"));
      }

      await this.mutes.clear(member.id);
    }
  }

  @d.command("mutes")
  @d.permission("view_list")
  public async postMuteList(msg: Message) {
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

    const caseIds = activeMutes.map(m => m.case_id).filter(v => !!v);
    const muteCases = caseIds.length ? await this.cases.get(caseIds) : [];
    const muteCasesById = muteCases.reduce((map, c) => map.set(c.id, c), new Map());

    lines.push(
      ...activeMutes.map(mute => {
        const user = this.bot.users.get(mute.user_id);
        const username = user ? `${user.username}#${user.discriminator}` : "Unknown#0000";
        const theCase = muteCasesById.get(mute.case_id);
        const caseName = theCase ? `Case #${theCase.case_number}` : "No case";

        let line = `**${username}** (\`${mute.user_id}\`)   📔 ${caseName}`;

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

        return line;
      }),
    );

    // Manually added mute roles
    const muteUserIds = activeMutes.reduce((set, m) => set.add(m.user_id), new Set());
    const manuallyMutedMembers = [];
    const muteRole = this.configValue("mute_role");

    if (muteRole) {
      this.guild.members.forEach(member => {
        if (muteUserIds.has(member.id)) return;
        if (member.roles.includes(muteRole)) manuallyMutedMembers.push(member);
      });
    }

    lines.push(
      ...manuallyMutedMembers.map(member => {
        return `\`Manual mute\` **${member.user.username}#${member.user.discriminator}** (\`${member.id}\`)`;
      }),
    );

    const message = `Active mutes (${activeMutes.length} total):\n\n${lines.join("\n")}`;
    const chunks = chunkMessageLines(message);
    for (const chunk of chunks) {
      msg.channel.createMessage(chunk);
    }
  }

  /**
   * Clear active mute from the member if the member is banned
   */
  @d.event("guildBanAdd")
  async onGuildBanAdd(_, user: User) {
    const mute = await this.mutes.findExistingMuteForUserId(user.id);
    if (mute) {
      this.mutes.clear(user.id);
    }
  }

  /**
   * COMMAND: Clear dangling mutes for members who have been banned
   */
  @d.command("clear_banned_mutes")
  @d.permission("cleanup")
  async clearBannedMutesCmd(msg: Message) {
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
  async onGuildMemberUpdate(_, member: Member) {
    const muteRole = this.configValue("mute_role");
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
  @d.permission("cleanup")
  async clearMutesWithoutRoleCmd(msg: Message) {
    const activeMutes = await this.mutes.getActiveMutes();
    const muteRole = this.configValue("mute_role");
    if (!muteRole) return;

    await msg.channel.createMessage("Clearing mutes from members that don't have the mute role...");

    let cleared = 0;
    for (const mute of activeMutes) {
      const member = this.guild.members.get(mute.user_id);
      if (!member) continue;

      if (!member.roles.includes(muteRole)) {
        await this.mutes.clear(mute.user_id);
        cleared++;
      }
    }

    msg.channel.createMessage(successMessage(`Cleared ${cleared} mutes from members that don't have the mute role`));
  }

  @d.command("clear_mute", "<userId:string>")
  @d.permission("cleanup")
  async clearMuteCmd(msg: Message, args: { userId: string }) {
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
      const member = this.guild.members.get(mute.user_id);
      if (!member) continue;

      try {
        this.serverLogs.ignoreLog(LogType.MEMBER_ROLE_REMOVE, member.id);
        await member.removeRole(this.configValue("mute_role"));
      } catch (e) {} // tslint:disable-line

      await this.mutes.clear(member.id);

      this.serverLogs.log(LogType.MEMBER_MUTE_EXPIRED, {
        member: stripObjectToScalars(member, ["user"]),
      });
    }
  }
}
