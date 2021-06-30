import { Snowflake, TextChannel } from "discord.js";
import * as t from "io-ts";
import { GuildPluginData } from "knub";
import { renderTemplate } from "../../../templateFormatter";
import { ActionError } from "../ActionError";
import { CustomEventsPluginType } from "../types";

export const MessageAction = t.type({
  type: t.literal("message"),
  channel: t.string,
  content: t.string,
});
export type TMessageAction = t.TypeOf<typeof MessageAction>;

export async function messageAction(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  action: TMessageAction,
  values: any,
) {
  const targetChannelId = await renderTemplate(action.channel, values, false);
  const targetChannel = pluginData.guild.channels.cache.get(targetChannelId as Snowflake);
  if (!targetChannel) throw new ActionError("Unknown target channel");
  if (!(targetChannel instanceof TextChannel)) throw new ActionError("Target channel is not a text channel");

  await targetChannel.send({ content: action.content });
}
