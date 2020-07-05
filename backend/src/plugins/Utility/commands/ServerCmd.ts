import { CategoryChannel, EmbedOptions, TextChannel, VoiceChannel } from "eris";
import moment from "moment-timezone";
import { embedPadding, formatNumber, memoize, MINUTES, trimLines } from "../../../utils";
import { utilityCmd } from "../types";
import humanizeDuration from "humanize-duration";

export const ServerCmd = utilityCmd(
  "server",
  {},

  {
    permission: "can_server",
    description: "Show information about the server",
    usage: "!server",
  },

  async ({ message }) => {
    const embed: EmbedOptions = {
      fields: [],
      color: parseInt("6b80cf", 16),
    };

    embed.thumbnail = { url: this.guild.iconURL };

    const createdAt = moment(this.guild.createdAt);
    const serverAge = humanizeDuration(moment().valueOf() - this.guild.createdAt, {
      largest: 2,
      round: true,
    });

    const owner = this.bot.users.get(this.guild.ownerID);
    const ownerName = owner ? `${owner.username}#${owner.discriminator}` : "Unknown#0000";

    embed.fields.push({
      name: `Server information - ${this.guild.name}`,
      value:
        trimLines(`
          Created: **${serverAge} ago** (${createdAt.format("YYYY-MM-DD[T]HH:mm:ss")})
          Owner: **${ownerName}** (${this.guild.ownerID})
          Voice region: **${this.guild.region}**
          ${this.guild.features.length > 0 ? "Features: " + this.guild.features.join(", ") : ""}
        `) + embedPadding,
    });

    const restGuild = await memoize(
      () => this.bot.getRESTGuild(this.guildId),
      `getRESTGuild_${this.guildId}`,
      10 * MINUTES,
    );

    // For servers with a vanity URL, we can use the numbers from the invite for online count
    // (which is nowadays usually more accurate for large servers)
    const invite = this.guild.vanityURL
      ? await memoize(
        () => this.bot.getInvite(this.guild.vanityURL, true),
        `getInvite_${this.guild.vanityURL}`,
        10 * MINUTES,
      )
      : null;

    const totalMembers = invite ? invite.memberCount : this.guild.memberCount;

    const onlineMemberCount = invite
      ? invite.presenceCount
      : this.guild.members.filter(m => m.status !== "offline").length;
    const offlineMemberCount = this.guild.memberCount - onlineMemberCount;

    let memberCountTotalLines = `Total: **${formatNumber(totalMembers)}**`;
    if (restGuild.maxMembers) {
      memberCountTotalLines += `\nMax: **${formatNumber(restGuild.maxMembers)}**`;
    }

    let memberCountOnlineLines = `Online: **${formatNumber(onlineMemberCount)}**`;
    if (restGuild.maxPresences) {
      memberCountOnlineLines += `\nMax online: **${formatNumber(restGuild.maxPresences)}**`;
    }

    embed.fields.push({
      name: "Members",
      inline: true,
      value: trimLines(`
          ${memberCountTotalLines}
          ${memberCountOnlineLines}
          Offline: **${formatNumber(offlineMemberCount)}**
        `),
    });

    const totalChannels = this.guild.channels.size;
    const categories = this.guild.channels.filter(channel => channel instanceof CategoryChannel);
    const textChannels = this.guild.channels.filter(channel => channel instanceof TextChannel);
    const voiceChannels = this.guild.channels.filter(channel => channel instanceof VoiceChannel);

    embed.fields.push({
      name: "Channels",
      inline: true,
      value:
        trimLines(`
          Total: **${totalChannels}** / 500
          Categories: **${categories.length}**
          Text: **${textChannels.length}**
          Voice: **${voiceChannels.length}**
        `) + embedPadding,
    });

    const maxEmojis =
      {
        0: 50,
        1: 100,
        2: 150,
        3: 250,
      }[this.guild.premiumTier] || 50;

    embed.fields.push({
      name: "Other stats",
      inline: true,
      value:
        trimLines(`
          Roles: **${this.guild.roles.size}** / 250
          Emojis: **${this.guild.emojis.length}** / ${maxEmojis}
          Boosts: **${this.guild.premiumSubscriptionCount ?? 0}** (level ${this.guild.premiumTier})
        `) + embedPadding,
    });

    message.channel.createMessage({ embed });
  }
);
