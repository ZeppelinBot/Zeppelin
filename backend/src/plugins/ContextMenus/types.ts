import { APIEmbed, Awaitable } from "discord.js";
import { BasePluginType } from "vety";
import { z } from "zod";
import { GuildCases } from "../../data/GuildCases.js";

export const zContextMenusConfig = z.strictObject({
  can_use: z.boolean().default(false),
  can_open_mod_menu: z.boolean().default(false),
});

export interface ContextMenuPluginType extends BasePluginType {
  configSchema: typeof zContextMenusConfig;
  state: {
    cases: GuildCases;
  };
}

export const enum ModMenuActionType {
  PAGE = "page",
  NOTE = "note",
  WARN = "warn",
  CLEAN = "clean",
  MUTE = "mute",
  BAN = "ban",
}

export const enum ModMenuNavigationType {
  FIRST = "first",
  PREV = "prev",
  NEXT = "next",
  LAST = "last",
  INFO = "info",
  CASES = "cases",
}

export interface ModMenuActionOpts {
  action: ModMenuActionType;
  target: string;
}

export type LoadModMenuPageFn = (page: number) => Awaitable<APIEmbed>;
