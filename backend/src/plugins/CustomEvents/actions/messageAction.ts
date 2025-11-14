import { Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { z } from "zod";
import { TemplateSafeValueContainer, renderTemplate } from "../../../templateFormatter.js";
import { zBoundedCharacters } from "../../../utils.js";
import { ActionError } from "../ActionError.js";
import { catchTemplateError } from "../catchTemplateError.js";
import { CustomEventsPluginType } from "../types.js";

export const zMessageAction = z.strictObject({
  type: z.literal("message"),
  channel: zBoundedCharacters(0, 100),
  content: zBoundedCharacters(0, 4000),
});
export type TMessageAction = z.infer<typeof zMessageAction>;

export async function messageAction(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  action: TMessageAction,
  values: TemplateSafeValueContainer,
) {
  const targetChannelId = await catchTemplateError(
    () => renderTemplate(action.channel, values, false),
    "Invalid channel format",
  );
  const targetChannel = pluginData.guild.channels.cache.get(targetChannelId as Snowflake);
  if (!targetChannel) throw new ActionError("Unknown target channel");
  if (!(targetChannel instanceof TextChannel)) throw new ActionError("Target channel is not a text channel");

  await targetChannel.send({ content: action.content });
}
