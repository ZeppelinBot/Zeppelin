import { GuildPluginData } from "knub";
import { CustomEventsPluginType, TCustomEvent } from "../types";
import * as t from "io-ts";
import { renderTemplate } from "../../../templateFormatter";
import { resolveMember } from "../../../utils";
import { ActionError } from "../ActionError";
import { canActOn } from "../../../pluginUtils";
import { Message, VoiceChannel } from "eris";

export const MoveToVoiceChannelAction = t.type({
  type: t.literal("move_to_vc"),
  target: t.string,
  channel: t.string,
});
export type TMoveToVoiceChannelAction = t.TypeOf<typeof MoveToVoiceChannelAction>;

export async function moveToVoiceChannelAction(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  action: TMoveToVoiceChannelAction,
  values: any,
  event: TCustomEvent,
  eventData: any,
) {
  const targetId = await renderTemplate(action.target, values, false);
  const target = await resolveMember(pluginData.client, pluginData.guild, targetId);
  if (!target) throw new ActionError("Unknown target member");

  if (event.trigger.type === "command" && !canActOn(pluginData, eventData.msg.member, target)) {
    throw new ActionError("Missing permissions");
  }

  const targetChannelId = await renderTemplate(action.channel, values, false);
  const targetChannel = pluginData.guild.channels.get(targetChannelId);
  if (!targetChannel) throw new ActionError("Unknown target channel");
  if (!(targetChannel instanceof VoiceChannel)) throw new ActionError("Target channel is not a voice channel");

  if (!target.voiceState.channelID) return;
  await target.edit({
    channelID: targetChannel.id,
  });
}
