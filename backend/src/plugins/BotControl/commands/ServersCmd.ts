import escapeStringRegexp from "escape-string-regexp";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { isStaffPreFilter } from "../../../pluginUtils.js";
import { createChunkedMessage, getUser, renderUsername, sorter } from "../../../utils.js";
import { botControlCmd } from "../types.js";

export const ServersCmd = botControlCmd({
  trigger: ["servers", "guilds"],
  permission: null,
  config: {
    preFilters: [isStaffPreFilter],
  },

  signature: {
    search: ct.string({ catchAll: true, required: false }),

    all: ct.switchOption({ def: false, shortcut: "a" }),
    initialized: ct.switchOption({ def: false, shortcut: "i" }),
    uninitialized: ct.switchOption({ def: false, shortcut: "u" }),
  },

  async run({ pluginData, message: msg, args }) {
    const showList = Boolean(args.all || args.initialized || args.uninitialized || args.search);
    const search = args.search ? new RegExp([...args.search].map((s) => escapeStringRegexp(s)).join(".*"), "i") : null;

    const joinedGuilds = Array.from(pluginData.client.guilds.cache.values());
    const loadedGuilds = pluginData.getVetyInstance().getLoadedGuilds();
    const loadedGuildsMap = loadedGuilds.reduce((map, guildData) => map.set(guildData.guildId, guildData), new Map());

    if (showList) {
      let filteredGuilds = Array.from(joinedGuilds);

      if (args.initialized) {
        filteredGuilds = filteredGuilds.filter((g) => loadedGuildsMap.has(g.id));
      }

      if (args.uninitialized) {
        filteredGuilds = filteredGuilds.filter((g) => !loadedGuildsMap.has(g.id));
      }

      if (args.search) {
        filteredGuilds = filteredGuilds.filter((g) => search!.test(`${g.id} ${g.name}`));
      }

      if (filteredGuilds.length) {
        filteredGuilds.sort(sorter((g) => g.name.toLowerCase()));
        const longestId = filteredGuilds.reduce((longest, guild) => Math.max(longest, guild.id.length), 0);
        const lines = filteredGuilds.map((g) => {
          const paddedId = g.id.padEnd(longestId, " ");
          const owner = getUser(pluginData.client, g.ownerId);
          return `\`${paddedId}\` **${g.name}** (${g.memberCount} members) (owner **${renderUsername(owner)}** \`${
            owner.id
          }\`)`;
        });
        createChunkedMessage(msg.channel, lines.join("\n"));
      } else {
        msg.channel.send("No servers matched the filters");
      }
    } else {
      const total = joinedGuilds.length;
      const initialized = joinedGuilds.filter((g) => loadedGuildsMap.has(g.id)).length;
      const unInitialized = total - initialized;

      msg.channel.send(
        `I am on **${total} total servers**, of which **${initialized} are initialized** and **${unInitialized} are not initialized**`,
      );
    }
  },
});
