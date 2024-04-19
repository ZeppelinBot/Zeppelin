import { BasePluginType, guildPluginEventListener } from "knub";
import z from "zod";
import { GuildContextMenuLinks } from "../../data/GuildContextMenuLinks";

export const zContextMenusConfig = z.strictObject({
  can_use: z.boolean(),
  user_muteindef: z.boolean(),
  user_mute1d: z.boolean(),
  user_mute1h: z.boolean(),
  user_info: z.boolean(),
  message_clean10: z.boolean(),
  message_clean25: z.boolean(),
  message_clean50: z.boolean(),
});

export interface ContextMenuPluginType extends BasePluginType {
  config: z.infer<typeof zContextMenusConfig>;
  state: {
    contextMenuLinks: GuildContextMenuLinks;
  };
}

export const contextMenuEvt = guildPluginEventListener<ContextMenuPluginType>();
