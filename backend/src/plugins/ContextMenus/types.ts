import { APIEmbed, Awaitable } from "discord.js";
import * as t from "io-ts";
import { BasePluginType } from "knub";
import { GuildCases } from "../../data/GuildCases";

export const ConfigSchema = t.type({
  can_use: t.boolean,

  can_open_mod_menu: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface ContextMenuPluginType extends BasePluginType {
  config: TConfigSchema;
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
