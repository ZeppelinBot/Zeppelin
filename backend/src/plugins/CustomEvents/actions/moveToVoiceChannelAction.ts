import { Snowflake, VoiceChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { z } from "zod";
import { canActOn } from "../../../pluginUtils.js";
import { TemplateSafeValueContainer, renderTemplate } from "../../../templateFormatter.js";
import { resolveMember, zBoundedCharacters } from "../../../utils.js";
import { ActionError } from "../ActionError.js";
import { catchTemplateError } from "../catchTemplateError.js";
import { CustomEventsPluginType, TCustomEvent } from "../types.js";

export const zMoveToVoiceChannelAction = z.strictObject({
  type: z.literal("move_to_vc"),
  target: zBoundedCharacters(0, 100),
  channel: zBoundedCharacters(0, 100),
});
export type TMoveToVoiceChannelAction = z.infer<typeof zMoveToVoiceChannelAction>;

export async function moveToVoiceChannelAction(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  action: TMoveToVoiceChannelAction,
  values: TemplateSafeValueContainer,
  event: TCustomEvent,
  eventData: any,
) {
  const targetId = await catchTemplateError(
    () => renderTemplate(action.target, values, false),
    "Invalid target format",
  );
  const target = await resolveMember(pluginData.client, pluginData.guild, targetId);
  if (!target) throw new ActionError("Unknown target member");

  if (event.trigger.type === "command" && !canActOn(pluginData, eventData.msg.member, target)) {
    throw new ActionError("Missing permissions");
  }

  const targetChannelId = await catchTemplateError(
    () => renderTemplate(action.channel, values, false),
    "Invalid channel format",
  );
  const targetChannel = pluginData.guild.channels.cache.get(targetChannelId as Snowflake);
  if (!targetChannel) throw new ActionError("Unknown target channel");
  if (!(targetChannel instanceof VoiceChannel)) throw new ActionError("Target channel is not a voice channel");

  if (!target.voice.channelId) return;
  await target.edit({
    channel: targetChannel.id,
  });
}
