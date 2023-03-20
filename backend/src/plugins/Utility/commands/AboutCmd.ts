import { APIEmbed, GuildChannel } from "discord.js";
import humanizeDuration from "humanize-duration";
import LCL from "last-commit-log";
import { shuffle } from "lodash";
import moment from "moment-timezone";
import { rootDir } from "../../../paths";
import { getCurrentUptime } from "../../../uptime";
import { resolveMember, sorter } from "../../../utils";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { utilityCmd } from "../types";

export const AboutCmd = utilityCmd({
  trigger: "about",
  description: "Show information about Zeppelin's status on the server",
  permission: "can_about",

  async run({ message: msg, pluginData }) {
    const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);

    const uptime = getCurrentUptime();
    const prettyUptime = humanizeDuration(uptime, { largest: 2, round: true });

    let lastCommit;

    try {
      const lcl = new LCL(rootDir);
      lastCommit = await lcl.getLastCommit();
    } catch {} // tslint:disable-line:no-empty

    let lastUpdate;
    let version;

    if (lastCommit) {
      lastUpdate = timeAndDate
        .inGuildTz(moment.utc(lastCommit.committer.date, "X"))
        .format(pluginData.getPlugin(TimeAndDatePlugin).getDateFormat("pretty_datetime"));
      version = lastCommit.shortHash;
    } else {
      lastUpdate = "?";
      version = "?";
    }

    const lastReload = humanizeDuration(Date.now() - pluginData.state.lastReload, {
      largest: 2,
      round: true,
    });

    const basicInfoRows = [
      ["Uptime", prettyUptime],
      ["Last config reload", `${lastReload} ago`],
      ["Last bot update", lastUpdate],
      ["Version", version],
      ["API latency", `${pluginData.client.ws.ping}ms`],
      ["Server timezone", timeAndDate.getGuildTz()],
    ];

    const loadedPlugins = Array.from(
      pluginData.getKnubInstance().getLoadedGuild(pluginData.guild.id)!.loadedPlugins.keys(),
    );
    loadedPlugins.sort();

    const aboutEmbed: APIEmbed = {
      title: `About ${pluginData.client.user!.username}`,
      fields: [
        {
          name: "Status",
          value: basicInfoRows.map(([label, value]) => `${label}: **${value}**`).join("\n"),
        },
        {
          name: `Loaded plugins on this server (${loadedPlugins.length})`,
          value: loadedPlugins.join(", "),
        },
      ],
    };

    const supporters = await pluginData.state.supporters.getAll();
    const shuffledSupporters = shuffle(supporters);

    if (supporters.length) {
      const formattedSupporters = shuffledSupporters
        // Bold every other supporter to make them easy to recognize from each other
        .map((s, i) => (i % 2 === 0 ? `**${s.name}**` : `__${s.name}__`))
        .join(" ");

      aboutEmbed.fields!.push({
        name: "Zeppelin supporters 🎉",
        value:
          "These amazing people have supported Zeppelin development by pledging on [Patreon](https://www.patreon.com/zeppelinbot):\n\n" +
          formattedSupporters,
        inline: false,
      });
    }

    // For the embed color, find the highest colored role the bot has - this is their color on the server as well
    const botMember = await resolveMember(pluginData.client, pluginData.guild, pluginData.client.user!.id);
    let botRoles = botMember?.roles.cache.map((r) => (msg.channel as GuildChannel).guild.roles.cache.get(r.id)!) || [];
    botRoles = botRoles.filter((r) => !!r); // Drop any unknown roles
    botRoles = botRoles.filter((r) => r.color); // Filter to those with a color
    botRoles.sort(sorter("position", "DESC")); // Sort by position (highest first)
    if (botRoles.length) {
      aboutEmbed.color = botRoles[0].color;
    }

    // Use the bot avatar as the embed image
    if (pluginData.client.user!.avatarURL()) {
      aboutEmbed.thumbnail = { url: pluginData.client.user!.avatarURL()! };
    }

    msg.channel.send({ embeds: [aboutEmbed] });
  },
});
