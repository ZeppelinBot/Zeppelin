import { decorators as d, IPluginOptions, getInviteLink, logger } from "knub";
import { trimPluginDescription, ZeppelinPluginClass, CommandInfo } from "./ZeppelinPluginClass";
import humanizeDuration from "humanize-duration";
import { Message, Member, Guild, TextableChannel, VoiceChannel, Channel, User } from "eris";
import { GuildVCAlerts } from "../data/GuildVCAlerts";
import moment from "moment-timezone";
import { resolveMember, sorter, createChunkedMessage, MINUTES, SECONDS } from "../utils";
import * as t from "io-ts";

const ConfigSchema = t.type({
  can_where: t.boolean,
  can_alert: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

const ALERT_LOOP_TIME = 30 * SECONDS;

export class LocatePlugin extends ZeppelinPluginClass<TConfigSchema> {
  public static pluginName = "locate_user";
  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Locate user",
    description: trimPluginDescription(`
      This plugin allows users with access to the commands the following:
      * Instantly receive an invite to the voice channel of a user
      * Be notified as soon as a user switches or joins a voice channel
    `),
  };

  private alerts: GuildVCAlerts;
  private outdatedAlertsTimeout: NodeJS.Timeout;
  private usersWithAlerts: string[] = [];
  private unloaded = false;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        can_where: false,
        can_alert: false,
      },
      overrides: [
        {
          level: ">=50",
          config: {
            can_where: true,
            can_alert: true,
          },
        },
      ],
    };
  }

  onLoad() {
    this.alerts = GuildVCAlerts.getGuildInstance(this.guildId);
    this.outdatedAlertsLoop();
    this.fillActiveAlertsList();
  }

  onUnload() {
    clearTimeout(this.outdatedAlertsTimeout);
    this.unloaded = true;
  }

  async outdatedAlertsLoop() {
    const outdatedAlerts = await this.alerts.getOutdatedAlerts();

    for (const alert of outdatedAlerts) {
      await this.alerts.delete(alert.id);
      await this.removeUserIdFromActiveAlerts(alert.user_id);
    }

    if (!this.unloaded) {
      this.outdatedAlertsTimeout = setTimeout(() => this.outdatedAlertsLoop(), ALERT_LOOP_TIME);
    }
  }

  async fillActiveAlertsList() {
    const allAlerts = await this.alerts.getAllGuildAlerts();

    allAlerts.forEach(alert => {
      if (!this.usersWithAlerts.includes(alert.user_id)) {
        this.usersWithAlerts.push(alert.user_id);
      }
    });
  }

  @d.command("where", "<member:resolvedMember>", {
    aliases: ["w"],
    extra: {
      info: <CommandInfo>{
        description: "Posts an instant invite to the voice channel that `<member>` is in",
        basicUsage: "!w 108552944961454080",
        parameterDescriptions: {
          member: "The member that we want to find",
        },
      },
    },
  })
  @d.permission("can_where")
  async whereCmd(msg: Message, args: { member: Member }) {
    const member = await resolveMember(this.bot, this.guild, args.member.id);
    sendWhere.call(this, this.guild, member, msg.channel, `${msg.member.mention} | `);
  }

  @d.command("follow", "<member:resolvedMember> [reminder:string$]", {
    aliases: ["f", "vcalert", "vca"],
    options: [
      {
        name: "duration",
        shortcut: "d",
        type: "delay",
      },
      {
        name: "active",
        shortcut: "a",
        isSwitch: true,
      },
    ],
    extra: {
      info: <CommandInfo>{
        description: "Sets up an alert that notifies you any time `<member>` switches or joins voice channels",
        basicUsage: "!f 108552944961454080",
        examples: trimPluginDescription(`
          To get an alert for 1 hour:  
          \`!f 108552944961454080 -d 1h\`

          To get an alert for 2 hours and 30 minutes with the reminder "Earrape":  
          \`!f 108552944961454080 -d 2h30m Earrape\`  
          *Note: The duration must be specified before the reminder, otherwise it will be part of it*

          To get an alert for 3 days and be moved to the channel:  
          \`!f 108552944961454080 -d 3d -a\`  
          *Note: As with the duration, active must be specified before the rminder, otherwise it will be part of it*
        `),
        optionDescriptions: {
          duration: "How long the alert shall be active. The alert will be automatically deleted after this time",
          active: "A switch that, when true, will move you to the channel the user joined",
        },
        parameterDescriptions: {
          member: "The server member we want to set as the alerts target",
          reminder: "Any text that will be displayed every time the alert triggers",
        },
      },
    },
  })
  @d.permission("can_alert")
  async followCmd(msg: Message, args: { member: Member; reminder?: string; duration?: number; active?: boolean }) {
    const time = args.duration || 10 * MINUTES;
    const alertTime = moment().add(time, "millisecond");
    const body = args.reminder || "None";
    const active = args.active || false;

    if (time < 30 * SECONDS) {
      this.sendErrorMessage(msg.channel, "Sorry, but the minimum duration for an alert is 30 seconds!");
      return;
    }

    await this.alerts.add(
      msg.author.id,
      args.member.id,
      msg.channel.id,
      alertTime.format("YYYY-MM-DD HH:mm:ss"),
      body,
      active,
    );
    if (!this.usersWithAlerts.includes(args.member.id)) {
      this.usersWithAlerts.push(args.member.id);
    }

    if (active) {
      this.sendSuccessMessage(
        msg.channel,
        `Every time ${args.member.mention} joins or switches VC in the next ${humanizeDuration(
          time,
        )} i will notify and move you.\nPlease make sure to be in a voice channel, otherwise i cannot move you!`,
      );
    } else {
      this.sendSuccessMessage(
        msg.channel,
        `Every time ${args.member.mention} joins or switches VC in the next ${humanizeDuration(
          time,
        )} i will notify you`,
      );
    }
  }

  @d.command("follows", [], {
    aliases: ["fs", "vcalerts", "vca"],
    extra: {
      info: <CommandInfo>{
        description: "Displays all of your active alerts ordered by expiration time",
      },
    },
  })
  @d.permission("can_alert")
  async listFollowCmd(msg: Message) {
    const alerts = await this.alerts.getAlertsByRequestorId(msg.member.id);
    if (alerts.length === 0) {
      this.sendErrorMessage(msg.channel, "You have no active alerts!");
      return;
    }

    alerts.sort(sorter("expires_at"));
    const longestNum = (alerts.length + 1).toString().length;
    const lines = Array.from(alerts.entries()).map(([i, alert]) => {
      const num = i + 1;
      const paddedNum = num.toString().padStart(longestNum, " ");
      return `\`${paddedNum}.\` \`${alert.expires_at}\` **Target:** <@!${alert.user_id}> **Reminder:** \`${
        alert.body
      }\` **Active:** ${alert.active.valueOf()}`;
    });
    await createChunkedMessage(msg.channel, lines.join("\n"));
  }

  @d.command("follows delete", "<num:number>", {
    aliases: ["fs d", "vcalerts delete", "vcalerts d", "vca d"],
    extra: {
      info: <CommandInfo>{
        description:
          "Deletes the alert at the position <num>.\nThe value needed for <num> can be found using `!follows` (`!fs`)",
      },
    },
  })
  @d.permission("can_alert")
  async deleteFollowCmd(msg: Message, args: { num: number }) {
    const alerts = await this.alerts.getAlertsByRequestorId(msg.member.id);
    alerts.sort(sorter("expires_at"));

    if (args.num > alerts.length || args.num <= 0) {
      this.sendErrorMessage(msg.channel, "Unknown alert!");
      return;
    }

    const toDelete = alerts[args.num - 1];
    await this.alerts.delete(toDelete.id);

    this.sendSuccessMessage(msg.channel, "Alert deleted");
  }

  @d.event("voiceChannelJoin")
  async userJoinedVC(member: Member, channel: Channel) {
    if (this.usersWithAlerts.includes(member.id)) {
      this.sendAlerts(member.id);
    }
  }

  @d.event("voiceChannelSwitch")
  async userSwitchedVC(member: Member, newChannel: Channel, oldChannel: Channel) {
    if (this.usersWithAlerts.includes(member.id)) {
      this.sendAlerts(member.id);
    }
  }

  @d.event("voiceChannelLeave")
  async userLeftVC(member: Member, channel: Channel) {
    const triggeredAlerts = await this.alerts.getAlertsByUserId(member.id);
    const voiceChannel = channel as VoiceChannel;

    triggeredAlerts.forEach(alert => {
      const txtChannel = this.bot.getChannel(alert.channel_id) as TextableChannel;
      txtChannel.createMessage(
        `🔴 <@!${alert.requestor_id}> the user <@!${alert.user_id}> disconnected out of \`${voiceChannel.name}\``,
      );
    });
  }

  @d.event("guildBanAdd")
  async onGuildBanAdd(_, user: User) {
    const alerts = await this.alerts.getAlertsByUserId(user.id);
    alerts.forEach(alert => {
      this.alerts.delete(alert.id);
    });
  }

  async sendAlerts(userId: string) {
    const triggeredAlerts = await this.alerts.getAlertsByUserId(userId);
    const member = await resolveMember(this.bot, this.guild, userId);

    triggeredAlerts.forEach(alert => {
      const prepend = `<@!${alert.requestor_id}>, an alert requested by you has triggered!\nReminder: \`${alert.body}\`\n`;
      const txtChannel = this.bot.getChannel(alert.channel_id) as TextableChannel;
      sendWhere.call(this, this.guild, member, txtChannel, prepend);
      if (alert.active) {
        this.moveMember(alert.requestor_id, member, txtChannel);
      }
    });
  }

  async removeUserIdFromActiveAlerts(userId: string) {
    const index = this.usersWithAlerts.indexOf(userId);
    if (index > -1) {
      this.usersWithAlerts.splice(index, 1);
    }
  }

  async moveMember(toMoveID: string, target: Member, errorChannel: TextableChannel) {
    const modMember: Member = await this.bot.getRESTGuildMember(this.guildId, toMoveID);
    if (modMember.voiceState.channelID != null) {
      try {
        await modMember.edit({
          channelID: target.voiceState.channelID,
        });
      } catch (e) {
        this.sendErrorMessage(errorChannel, "Failed to move you. Are you in a voice channel?");
        return;
      }
    } else {
      this.sendErrorMessage(errorChannel, "Failed to move you. Are you in a voice channel?");
    }
  }
}

async function sendWhere(guild: Guild, member: Member, channel: TextableChannel, prepend: string) {
  const voice = guild.channels.get(member.voiceState.channelID) as VoiceChannel;

  if (voice == null) {
    channel.createMessage(prepend + "That user is not in a channel");
  } else {
    let invite = null;
    try {
      invite = await createInvite(voice);
    } catch (e) {
      this.sendErrorMessage(channel, "Cannot create an invite to that channel!");
      return;
    }
    channel.createMessage(
      prepend + ` ${member.mention} is in the following channel: \`${voice.name}\` ${getInviteLink(invite)}`,
    );
  }
}

async function createInvite(vc: VoiceChannel) {
  const existingInvites = await vc.getInvites();

  if (existingInvites.length !== 0) {
    return existingInvites[0];
  } else {
    return vc.createInvite(undefined);
  }
}
