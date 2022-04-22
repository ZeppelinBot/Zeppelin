import { MessageEmbedOptions, Permissions, Role } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { EmbedWith, preEmbedPadding, trimLines } from "../../../utils";
import { PERMISSION_NAMES } from "../../../utils/permissionNames.js";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { UtilityPluginType } from "../types";

const MENTION_ICON = "https://cdn.discordapp.com/attachments/705009450855039042/839284872152481792/mention.png";

export async function getRoleInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  role: Role,
  requestMemberId?: string,
): Promise<MessageEmbedOptions> {
  const embed: EmbedWith<"fields"> = {
    fields: [],
  };

  embed.author = {
    name: `Role:  ${role.name}`,
    icon_url: MENTION_ICON,
  };

  embed.color = role.color;

  const createdAt = moment.utc(role.createdAt, "x");
  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);
  const tzCreatedAt = requestMemberId
    ? await timeAndDate.inMemberTz(requestMemberId, createdAt)
    : timeAndDate.inGuildTz(createdAt);
  const prettyCreatedAt = tzCreatedAt.format(timeAndDate.getDateFormat("pretty_datetime"));
  const roleAge = humanizeDuration(Date.now() - role.createdTimestamp, {
    largest: 2,
    round: true,
  });

  const rolePerms = role.permissions.has(Permissions.FLAGS.ADMINISTRATOR)
    ? [PERMISSION_NAMES.ADMINISTRATOR]
    : role.permissions.toArray().map((p) => PERMISSION_NAMES[p]);

  // -1 because of the @everyone role
  const totalGuildRoles = pluginData.guild.roles.cache.size - 1;

  embed.fields.push({
    name: preEmbedPadding + "Role information",
    value: trimLines(`
      Name: **${role.name}**
      ID: \`${role.id}\`
      Created: **${roleAge} ago** (\`${prettyCreatedAt}\`)
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
