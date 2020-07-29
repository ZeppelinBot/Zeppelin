import { PluginData } from "knub";
import { CustomEventsPluginType } from "../types";
import * as t from "io-ts";
import { renderTemplate } from "../../../templateFormatter";
import { ActionError } from "../ActionError";
import { TextChannel } from "eris";

export const MessageAction = t.type({
  type: t.literal("message"),
  channel: t.string,
  content: t.string,
});
export type TMessageAction = t.TypeOf<typeof MessageAction>;

export async function messageAction(
  pluginData: PluginData<CustomEventsPluginType>,
  action: TMessageAction,
  values: any,
) {
  const targetChannelId = await renderTemplate(action.channel, values, false);
  const targetChannel = pluginData.guild.channels.get(targetChannelId);
  if (!targetChannel) throw new ActionError("Unknown target channel");
  if (!(targetChannel instanceof TextChannel)) throw new ActionError("Target channel is not a text channel");

  await targetChannel.createMessage({ content: action.content });
}
