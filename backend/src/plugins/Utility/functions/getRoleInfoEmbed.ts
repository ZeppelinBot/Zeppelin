import { PluginData } from "knub";
import { UtilityPluginType } from "../types";
import { Constants, EmbedOptions } from "eris";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { formatNumber, preEmbedPadding, trimLines } from "../../../utils";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";

export async function getRoleInfoEmbed(
  pluginData: PluginData<UtilityPluginType>,
  roleId: string,
  requestMemberId?: string,
): Promise<EmbedOptions | null> {
  const role = pluginData.guild.roles.get(roleId);
  if (!role) {
    return null;
  }

  const embed: EmbedOptions = {
    fields: [],
  };

  // TODO Perhaps use a '@' as icon?
  // embed.author = {
  //   name: role.name,
  //   icon_url: icon,
  // };

  embed.color = role.color;

  const createdAt = moment.utc(role.createdAt, "x");
  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);
  const tzCreatedAt = requestMemberId
    ? await timeAndDate.inMemberTz(requestMemberId, createdAt)
    : timeAndDate.inGuildTz(createdAt);
  const prettyCreatedAt = tzCreatedAt.format(timeAndDate.getDateFormat("pretty_datetime"));
  const roleAge = humanizeDuration(Date.now() - role.createdAt, {
    largest: 2,
    round: true,
  });

  const rolePerms = Object.keys(role.permissions.json).join(", ");

  embed.fields.push({
    name: preEmbedPadding + "Role information",
    value: trimLines(`
      Name: **${role.name}**
      ID: \`${role.id}\`
      Created: **${roleAge} ago** (\`${prettyCreatedAt}\`)
      Position: ${role.position}
      Color: #${role.color.toString(16).toUpperCase().padStart(6, "0")}
      Mentionable: ${role.mentionable}
      Hoisted: ${role.hoist}
      Managed: ${role.managed}
      Permissions: ${rolePerms}
      Members: TODO
      Mention: <@&${role.id}> (\`<@&${role.id}>\`)
    `),
  });

  return embed;
}
