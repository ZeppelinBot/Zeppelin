import { PluginData } from "knub";
import { Awaitable } from "knub/dist/utils";
import * as t from "io-ts";
import { AutomodContext, AutomodPluginType } from "./types";

export interface AutomodTriggerMatchResult<TExtra extends any = unknown> {
  extraContexts?: AutomodContext[];
  extra?: TExtra;

  silentClean?: boolean;
}

type AutomodTriggerMatchFn<TConfigType, TMatchResultExtra> = (meta: {
  ruleName: string;
  pluginData: PluginData<AutomodPluginType>;
  context: AutomodContext;
  triggerConfig: TConfigType;
}) => Awaitable<null | AutomodTriggerMatchResult<TMatchResultExtra>>;

type AutomodTriggerRenderMatchInformationFn<TConfigType, TMatchResultExtra> = (meta: {
  ruleName: string;
  pluginData: PluginData<AutomodPluginType>;
  contexts: AutomodContext[];
  triggerConfig: TConfigType;
  matchResult: AutomodTriggerMatchResult<TMatchResultExtra>;
}) => Awaitable<string>;

export interface AutomodTriggerBlueprint<TConfigType extends t.Any, TMatchResultExtra extends t.Any> {
  configType: TConfigType;
  defaultConfig: Partial<t.TypeOf<TConfigType>>;

  matchResultType: TMatchResultExtra;

  match: AutomodTriggerMatchFn<t.TypeOf<TConfigType>, t.TypeOf<TMatchResultExtra>>;
  renderMatchInformation: AutomodTriggerRenderMatchInformationFn<t.TypeOf<TConfigType>, t.TypeOf<TMatchResultExtra>>;
}

export function automodTrigger<TConfigType extends t.Any, TMatchResultExtra extends t.Any>(
  blueprint: AutomodTriggerBlueprint<TConfigType, TMatchResultExtra>,
): AutomodTriggerBlueprint<TConfigType, TMatchResultExtra> {
  return blueprint;
}

type AutomodActionApplyFn<TConfigType> = (meta: {
  ruleName: string;
  pluginData: PluginData<AutomodPluginType>;
  contexts: AutomodContext[];
  actionConfig: TConfigType;
}) => Awaitable<void>;

export interface AutomodActionBlueprint<TConfigType extends t.Any> {
  configType: TConfigType;
  apply: AutomodActionApplyFn<t.TypeOf<TConfigType>>;
}

export function automodAction<TConfigType extends t.Any>(
  blueprint: AutomodActionBlueprint<TConfigType>,
): AutomodActionBlueprint<TConfigType> {
  return blueprint;
}
