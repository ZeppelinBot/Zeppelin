import { APIEmbed, Awaitable } from "discord.js";
import { BasePluginType } from "knub";
import z from "zod/v4";
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

export const ModMenuActionType = {
  PAGE: "page",
  NOTE: "note",
  WARN: "warn",
  CLEAN: "clean",
  MUTE: "mute",
  BAN: "ban",
} as const;

export type ModMenuActionType = typeof ModMenuActionType[keyof typeof ModMenuActionType];

export const ModMenuNavigationType = {
  FIRST: "first",
  PREV: "prev",
  NEXT: "next",
  LAST: "last",
  INFO: "info",
  CASES: "cases",
} as const;

export type ModMenuNavigationType = typeof ModMenuNavigationType[keyof typeof ModMenuNavigationType];

export interface ModMenuActionOpts {
  action: ModMenuActionType;
  target: string;
}

export type LoadModMenuPageFn = (page: number) => Awaitable<APIEmbed>;
