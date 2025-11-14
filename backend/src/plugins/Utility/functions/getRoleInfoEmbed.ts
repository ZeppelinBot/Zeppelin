import { APIEmbed, PermissionFlagsBits, Role } from "discord.js";
import { GuildPluginData } from "vety";
import { EmbedWith, preEmbedPadding, trimLines } from "../../../utils.js";
import { PERMISSION_NAMES } from "../../../utils/permissionNames.js";
import { UtilityPluginType } from "../types.js";

const MENTION_ICON = "https://cdn.discordapp.com/attachments/705009450855039042/839284872152481792/mention.png";

export async function getRoleInfoEmbed(pluginData: GuildPluginData<UtilityPluginType>, role: Role): Promise<APIEmbed> {
  const embed: EmbedWith<"fields" | "author" | "color"> = {
    fields: [],
    author: {
      name: `Role:  ${role.name}`,
      icon_url: MENTION_ICON,
    },
    color: role.color,
  };

  const rolePerms = role.permissions.has(PermissionFlagsBits.Administrator)
    ? [PERMISSION_NAMES.Administrator]
    : role.permissions.toArray().map((p) => PERMISSION_NAMES[p]);

  // -1 because of the @everyone role
  const totalGuildRoles = pluginData.guild.roles.cache.size - 1;

  embed.fields.push({
    name: preEmbedPadding + "Role information",
    value: trimLines(`
      Name: **${role.name}**
      ID: \`${role.id}\`
      Created: **<t:${Math.round(role.createdTimestamp / 1000)}:R>**
      Position: **${role.position} / ${totalGuildRoles}**
      Color: **#${role.color.toString(16).toUpperCase().padStart(6, "0")}**
      Mentionable: **${role.mentionable ? "Yes" : "No"}**
      Hoisted: **${role.hoist ? "Yes" : "No"}**
      Permissions: \`${rolePerms.length ? rolePerms.join(", ") : "None"}\`
      Mention: <@&${role.id}> (\`<@&${role.id}>\`)
    `),
  });

  return embed;
}
