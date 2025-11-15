import { APIEmbed, GuildChannel } from "discord.js";
import { shuffle } from "lodash-es";
import moment from "moment-timezone";
import { accessSync, readFileSync } from "node:fs";
import { rootDir } from "../../../paths.js";
import { getBotStartTime } from "../../../uptime.js";
import { resolveMember, sorter } from "../../../utils.js";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin.js";
import { utilityCmd } from "../types.js";

let commitHash: string | null = null;
try {
  accessSync(`${rootDir}/.commit-hash`);
  commitHash = readFileSync(`${rootDir}/.commit-hash`, "utf-8").trim();
} catch {}

let buildTime: string | null = null;
try {
  accessSync(`${rootDir}/.build-time`);
  buildTime = readFileSync(`${rootDir}/.build-time`, "utf-8").trim();
} catch {}

export const AboutCmd = utilityCmd({
  trigger: "about",
  description: "Show information about Zeppelin's status on the server",
  permission: "can_about",

  async run({ message: msg, pluginData }) {
    const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);

    const botStartTime = getBotStartTime();
    const buildTimeMoment = buildTime ? moment.utc(buildTime, "YYYY-MM-DDTHH:mm:ss[Z]") : null;

    const basicInfoRows = [
      ["Bot start time", `<t:${Math.floor(botStartTime / 1000)}:R>`],
      ["Last config reload", `<t:${Math.floor(pluginData.state.lastReload / 1000)}:R>`],
      ["Last bot update", buildTimeMoment ? `<t:${Math.floor(buildTimeMoment.unix())}:f>` : "Unknown"],
      ["Version", commitHash?.slice(0, 7) || "Unknown"],
      ["API latency", `${pluginData.client.ws.ping}ms`],
      ["Server timezone", timeAndDate.getGuildTz()],
    ];

    const loadedPlugins = Array.from(
      pluginData.getVetyInstance().getLoadedGuild(pluginData.guild.id)!.loadedPlugins.keys(),
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
        value: "These amazing people have supported Zeppelin development:\n\n" + formattedSupporters,
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
    if (pluginData.client.user!.displayAvatarURL()) {
      aboutEmbed.thumbnail = { url: pluginData.client.user!.displayAvatarURL()! };
    }

    msg.channel.send({ embeds: [aboutEmbed] });
  },
});
