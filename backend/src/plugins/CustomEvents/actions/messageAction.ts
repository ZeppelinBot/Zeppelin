import { Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import z from "zod";
import { TemplateSafeValueContainer, renderTemplate } from "../../../templateFormatter";
import { zBoundedCharacters, zSnowflake } from "../../../utils";
import { ActionError } from "../ActionError";
import { CustomEventsPluginType } from "../types";

export const zMessageAction = z.strictObject({
  type: z.literal("message"),
  channel: zSnowflake,
  content: zBoundedCharacters(0, 4000),
});
export type TMessageAction = z.infer<typeof zMessageAction>;

export async function messageAction(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  action: TMessageAction,
  values: TemplateSafeValueContainer,
) {
  const targetChannelId = await renderTemplate(action.channel, values, false);
  const targetChannel = pluginData.guild.channels.cache.get(targetChannelId as Snowflake);
  if (!targetChannel) throw new ActionError("Unknown target channel");
  if (!(targetChannel instanceof TextChannel)) throw new ActionError("Target channel is not a text channel");

  await targetChannel.send({ content: action.content });
}
