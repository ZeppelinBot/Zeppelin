import { Member } from "eris";
import { GuildPluginData } from "knub";
import { hasPermission } from "src/pluginUtils";
import { AFKPluginType } from "../types";

// https://github.com/sapphire-project/utilities/blob/main/packages/discord-utilities/src/lib/regexes.ts#L58
const HttpUrlRegex = /^(https?):\/\/[^\s$.?#].[^\s]*$/;

// https://github.com/sapphire-project/utilities/blob/main/packages/discord-utilities/src/lib/regexes.ts#L25
const DiscordInviteLinkRegex = /^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)?(?<code>[\w\d-]{2,})$/i;

export function parseStatusMessage(pluginData: GuildPluginData<AFKPluginType>, member: Member, status: string) {
  const allow_links = hasPermission(pluginData, "allow_links", { member });
  const allow_invites = hasPermission(pluginData, "allow_invites", { member });

  if (!allow_links && HttpUrlRegex.test(status)) return "Links are not allowed in an AFK status!";
  if (!allow_invites && DiscordInviteLinkRegex.test(status)) return "Invites are not allowed in an AFK status!";
}
