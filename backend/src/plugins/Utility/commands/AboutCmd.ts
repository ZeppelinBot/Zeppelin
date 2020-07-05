import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { messageLink, multiSorter, resolveMember, sorter } from "../../../utils";
import { sendErrorMessage } from "../../../pluginUtils";
import { GuildChannel, MessageContent, TextChannel } from "eris";
import { getCurrentUptime } from "../../../uptime";
import humanizeDuration from "humanize-duration";
import LCL from "last-commit-log";
import path from "path";
import moment from "moment-timezone";

export const AboutCmd = utilityCmd({
  trigger: "about",
  description: "Show information about Zeppelin's status on the server",
  permission: "can_about",

  async run({ message: msg, pluginData }) {
    const uptime = getCurrentUptime();
    const prettyUptime = humanizeDuration(uptime, { largest: 2, round: true });

    let lastCommit;

    try {
      // From project root
      // FIXME: Store these paths properly somewhere
      const lcl = new LCL(path.resolve(__dirname, "..", "..", ".."));
      lastCommit = await lcl.getLastCommit();
    } catch (e) {} // tslint:disable-line:no-empty

    let lastUpdate;
    let version;

    if (lastCommit) {
      lastUpdate = moment(lastCommit.committer.date, "X").format("LL [at] H:mm [(UTC)]");
      version = lastCommit.shortHash;
    } else {
      lastUpdate = "?";
      version = "?";
    }

    const shard = pluginData.client.shards.get(pluginData.client.guildShardMap[pluginData.guild.id]);

    const lastReload = humanizeDuration(Date.now() - pluginData.state.lastReload, {
      largest: 2,
      round: true,
    });

    const basicInfoRows = [
      ["Uptime", prettyUptime],
      ["Last reload", `${lastReload} ago`],
      ["Last update", lastUpdate],
      ["Version", version],
      ["API latency", `${shard.latency}ms`],
    ];

    const loadedPlugins = Array.from(
      pluginData
        .getKnubInstance()
        .getLoadedGuild(pluginData.guild.id)
        .loadedPlugins.keys(),
    );
    loadedPlugins.sort();

    const aboutContent: MessageContent = {
      embed: {
        title: `About ${pluginData.client.user.username}`,
        fields: [
          {
            name: "Status",
            value: basicInfoRows
              .map(([label, value]) => {
                return `${label}: **${value}**`;
              })
              .join("\n"),
          },
          {
            name: `Loaded plugins on this server (${loadedPlugins.length})`,
            value: loadedPlugins.join(", "),
          },
        ],
      },
    };

    const supporters = await pluginData.state.supporters.getAll();
    supporters.sort(
      multiSorter([
        [r => r.amount, "DESC"],
        [r => r.name.toLowerCase(), "ASC"],
      ]),
    );

    if (supporters.length) {
      aboutContent.embed.fields.push({
        name: "Zeppelin supporters 🎉",
        value: supporters.map(s => `**${s.name}** ${s.amount ? `${s.amount}€/mo` : ""}`.trim()).join("\n"),
      });
    }

    // For the embed color, find the highest colored role the bot has - this is their color on the server as well
    const botMember = await resolveMember(pluginData.client, pluginData.guild, pluginData.client.user.id);
    let botRoles = botMember.roles.map(r => (msg.channel as GuildChannel).guild.roles.get(r));
    botRoles = botRoles.filter(r => !!r); // Drop any unknown roles
    botRoles = botRoles.filter(r => r.color); // Filter to those with a color
    botRoles.sort(sorter("position", "DESC")); // Sort by position (highest first)
    if (botRoles.length) {
      aboutContent.embed.color = botRoles[0].color;
    }

    // Use the bot avatar as the embed image
    if (pluginData.client.user.avatarURL) {
      aboutContent.embed.thumbnail = { url: pluginData.client.user.avatarURL };
    }

    msg.channel.createMessage(aboutContent);
  },
});
