import { Role, TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { chunkArray, sorter, trimLines } from "../../../utils";
import { refreshMembersIfNeeded } from "../refreshMembers";
import { utilityCmd } from "../types";

export const RolesCmd = utilityCmd({
  trigger: "roles",
  description: "List all roles or roles matching a search",
  usage: "!roles mod",
  permission: "can_roles",

  signature: {
    search: ct.string({ required: false, catchAll: true }),

    counts: ct.switchOption(),
    sort: ct.string({ option: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const { guild } = pluginData;

    let roles: Array<{ _memberCount?: number } & Role> = Array.from(
      (msg.channel as TextChannel).guild.roles.cache.values(),
    );
    let sort = args.sort;

    if (args.search) {
      const searchStr = args.search.toLowerCase();
      roles = roles.filter(r => r.name.toLowerCase().includes(searchStr) || r.id === searchStr);
    }

    if (args.counts) {
      await refreshMembersIfNeeded(guild);

      // If the user requested role member counts as well, calculate them and sort the roles by their member count
      const roleCounts: Map<string, number> = Array.from(guild.members.cache.values()).reduce((map, member) => {
        for (const roleId of member.roles.cache) {
          if (!map.has(roleId)) map.set(roleId, 0);
          map.set(roleId, map.get(roleId) + 1);
        }

        return map;
      }, new Map());

      // The "everyone" role always has all members in it
      roleCounts.set(guild.id, guild.memberCount);

      for (const role of roles) {
        role._memberCount = roleCounts.has(role.id) ? roleCounts.get(role.id) : 0;
      }

      if (!sort) sort = "-memberCount";
      roles.sort((a, b) => {
        if (a._memberCount! > b._memberCount!) return -1;
        if (a._memberCount! < b._memberCount!) return 1;
        return 0;
      });
    } else {
      // Otherwise sort by name
      roles.sort((a, b) => {
        if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
        if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
        return 0;
      });
    }

    if (!sort) sort = "name";

    let sortDir: "ASC" | "DESC" = "ASC";
    if (sort && sort[0] === "-") {
      sort = sort.slice(1);
      sortDir = "DESC";
    }

    if (sort === "position" || sort === "order") {
      roles.sort(sorter("position", sortDir));
    } else if (sort === "memberCount" && args.counts) {
      roles.sort(sorter("_memberCount", sortDir));
    } else if (sort === "name") {
      roles.sort(sorter(r => r.name.toLowerCase(), sortDir));
    } else {
      sendErrorMessage(pluginData, msg.channel, "Unknown sorting method");
      return;
    }

    const longestId = roles.reduce((longest, role) => Math.max(longest, role.id.length), 0);

    const chunks = chunkArray(roles, 20);
    for (const [i, chunk] of chunks.entries()) {
      const roleLines = chunk.map(role => {
        const paddedId = role.id.padEnd(longestId, " ");
        let line = `${paddedId} ${role.name}`;
        if (role._memberCount != null) {
          line += role._memberCount === 1 ? ` (${role._memberCount} member)` : ` (${role._memberCount} members)`;
        }
        return line;
      });

      if (i === 0) {
        msg.channel.send(
          trimLines(`
          ${args.search ? "Total roles found" : "Total roles"}: ${roles.length}
          \`\`\`py\n${roleLines.join("\n")}\`\`\`
        `),
        );
      } else {
        msg.channel.send("```py\n" + roleLines.join("\n") + "```");
      }
    }
  },
});
