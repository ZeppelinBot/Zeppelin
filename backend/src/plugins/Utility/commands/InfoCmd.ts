import { utilityCmd } from "../types";
import { baseTypeHelpers as t } from "knub";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { embedPadding, resolveMember, trimLines, UnknownUser } from "../../../utils";
import { EmbedOptions, GuildTextableChannel } from "eris";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { CaseTypes } from "../../../data/CaseTypes";

export const InfoCmd = utilityCmd({
  trigger: "info",
  description: "Show basic information about a user",
  usage: "!info 106391128718245888",
  permission: "can_info",

  signature: {
    user: ct.resolvedUserLoose({ required: false }),

    compact: t.switchOption({ shortcut: "c" }),
  },

  async run({ message: msg, args, pluginData }) {
    const user = args.user || msg.author;

    let member;
    if (!(user instanceof UnknownUser)) {
      member = await resolveMember(pluginData.client, (msg.channel as GuildTextableChannel).guild, user.id);
    }

    const embed: EmbedOptions = {
      fields: [],
    };

    if (user && !(user instanceof UnknownUser)) {
      const createdAt = moment(user.createdAt);
      const accountAge = humanizeDuration(moment().valueOf() - user.createdAt, {
        largest: 2,
        round: true,
      });

      embed.title = `${user.username}#${user.discriminator}`;
      embed.thumbnail = { url: user.avatarURL };

      if (args.compact) {
        embed.fields.push({
          name: "User information",
          value: trimLines(`
            Profile: <@!${user.id}>
            Created: **${accountAge} ago (${createdAt.format("YYYY-MM-DD[T]HH:mm:ss")})**
            `),
        });
        if (member) {
          const joinedAt = moment(member.joinedAt);
          const joinAge = humanizeDuration(moment().valueOf() - member.joinedAt, {
            largest: 2,
            round: true,
          });
          embed.fields[0].value += `\nJoined: **${joinAge} ago (${joinedAt.format("YYYY-MM-DD[T]HH:mm:ss")})**`;
        } else {
          embed.fields.push({
            name: "!!  USER IS NOT ON THE SERVER  !!",
            value: embedPadding,
          });
        }
        msg.channel.createMessage({ embed });
        return;
      } else {
        embed.fields.push({
          name: "User information",
          value:
            trimLines(`
            ID: **${user.id}**
            Profile: <@!${user.id}>
            Created: **${accountAge} ago (${createdAt.format("YYYY-MM-DD[T]HH:mm:ss")})**
            `) + embedPadding,
        });
      }
    } else {
      embed.title = `Unknown user`;
    }

    if (member) {
      const joinedAt = moment(member.joinedAt);
      const joinAge = humanizeDuration(moment().valueOf() - member.joinedAt, {
        largest: 2,
        round: true,
      });
      const roles = member.roles.map(id => pluginData.guild.roles.get(id)).filter(r => !!r);

      embed.fields.push({
        name: "Member information",
        value:
          trimLines(`
          Joined: **${joinAge} ago (${joinedAt.format("YYYY-MM-DD[T]HH:mm:ss")})**
          ${roles.length > 0 ? "Roles: " + roles.map(r => r.name).join(", ") : ""}
        `) + embedPadding,
      });

      const voiceChannel = member.voiceState.channelID
        ? pluginData.guild.channels.get(member.voiceState.channelID)
        : null;
      if (voiceChannel || member.voiceState.mute || member.voiceState.deaf) {
        embed.fields.push({
          name: "Voice information",
          value:
            trimLines(`
          ${voiceChannel ? `Current voice channel: **${voiceChannel ? voiceChannel.name : "None"}**` : ""}
          ${member.voiceState.mute ? "Server voice muted: **Yes**" : ""}
          ${member.voiceState.deaf ? "Server voice deafened: **Yes**" : ""}
        `) + embedPadding,
        });
      }
    } else {
      embed.fields.push({
        name: "!!  USER IS NOT ON THE SERVER  !!",
        value: embedPadding,
      });
    }
    const cases = (await pluginData.state.cases.getByUserId(user.id)).filter(c => !c.is_hidden);

    if (cases.length > 0) {
      cases.sort((a, b) => {
        return a.created_at < b.created_at ? 1 : -1;
      });

      const caseSummary = cases.slice(0, 3).map(c => {
        return `${CaseTypes[c.type]} (#${c.case_number})`;
      });

      const summaryText = cases.length > 3 ? "Last 3 cases" : "Summary";

      embed.fields.push({
        name: "Cases",
        value: trimLines(`
          Total cases: **${cases.length}**
          ${summaryText}: ${caseSummary.join(", ")}
        `),
      });
    }

    msg.channel.createMessage({ embed });
  },
});
