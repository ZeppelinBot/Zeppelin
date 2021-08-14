import { ContextMenuInteraction } from "discord.js";
import * as t from "io-ts";
import { GuildPluginData } from "knub";
import { Awaitable } from "knub/dist/utils";
import { ContextMenuPluginType } from "./types";

type ContextActionApplyFn<TConfigType> = (meta: {
  actionName: string;
  pluginData: GuildPluginData<ContextMenuPluginType>;
  actionConfig: TConfigType;
  interaction: ContextMenuInteraction;
}) => Awaitable<void>;

export interface ContextActionBlueprint<TConfigType extends t.Any> {
  configType: TConfigType;
  defaultConfig: Partial<t.TypeOf<TConfigType>>;

  apply: ContextActionApplyFn<t.TypeOf<TConfigType>>;
}

export function contextMenuAction<TConfigType extends t.Any>(
  blueprint: ContextActionBlueprint<TConfigType>,
): ContextActionBlueprint<TConfigType> {
  return blueprint;
}
