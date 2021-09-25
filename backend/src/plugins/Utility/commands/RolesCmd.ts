import { Role } from "discord.js";
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

    let roles: Role[] = Array.from(guild.roles.cache.values());
    let sort = args.sort;

    if (args.search) {
      const searchStr = args.search.toLowerCase();
      roles = roles.filter((r) => r.name.toLowerCase().includes(searchStr) || r.id === searchStr);
    }

    let roleCounts: Map<string, number> | null = null;
    if (args.counts) {
      await refreshMembersIfNeeded(guild);

      roleCounts = new Map<string, number>(guild.roles.cache.map((r) => [r.id, 0]));

      for (const member of guild.members.cache.values()) {
        for (const id of member.roles.cache.keys()) {
          roleCounts.set(id, (roleCounts.get(id) ?? 0) + 1);
        }
      }

      // The "@everyone" role always has all members in it
      roleCounts.set(guild.id, guild.memberCount);

      if (!sort) sort = "-memberCount";
    }

    if (!sort) sort = "name";

    let sortDir: "ASC" | "DESC" = "ASC";
    if (sort[0] === "-") {
      sort = sort.slice(1);
      sortDir = "DESC";
    }

    if (sort === "position" || sort === "order") {
      roles.sort(sorter("position", sortDir));
    } else if (sort === "memberCount" && args.counts) {
      roles.sort((first, second) => roleCounts!.get(second.id)! - roleCounts!.get(first.id)!);
    } else if (sort === "name") {
      roles.sort(sorter((r) => r.name.toLowerCase(), sortDir));
    } else {
      sendErrorMessage(pluginData, msg.channel, "Unknown sorting method");
      return;
    }

    const longestId = roles.reduce((longest, role) => Math.max(longest, role.id.length), 0);

    const chunks = chunkArray(roles, 20);
    for (const [i, chunk] of chunks.entries()) {
      const roleLines = chunk.map((role) => {
        const paddedId = role.id.padEnd(longestId, " ");
        let line = `${paddedId} ${role.name}`;
        const memberCount = roleCounts?.get(role.id);
        if (memberCount !== undefined) {
          line += ` (${memberCount} ${memberCount === 1 ? "member" : "members"})`;
        }
        return line;
      });

      const codeBlock = "```py\n" + roleLines.join("\n") + "```";
      if (i === 0) {
        msg.channel.send(
          trimLines(`
          ${args.search ? "Total roles found" : "Total roles"}: ${roles.length}
          ${codeBlock}
        `),
        );
      } else {
        msg.channel.send(codeBlock);
      }
    }
  },
});
