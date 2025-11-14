import { GuildPluginData } from "vety";
import { z, type ZodTypeAny } from "zod";
import { Awaitable } from "../../utils/typeUtils.js";
import { AutomodContext, AutomodPluginType } from "./types.js";

interface BaseAutomodTriggerMatchResult {
  extraContexts?: AutomodContext[];

  silentClean?: boolean; // TODO: Maybe generalize to a "silent" value in general, which mutes alert/log

  summary?: string;
  fullSummary?: string;
}

export type AutomodTriggerMatchResult<TExtra = unknown> = unknown extends TExtra
  ? BaseAutomodTriggerMatchResult
  : BaseAutomodTriggerMatchResult & { extra: TExtra };

type AutomodTriggerMatchFn<TConfigType, TMatchResultExtra> = (meta: {
  ruleName: string;
  pluginData: GuildPluginData<AutomodPluginType>;
  context: AutomodContext;
  triggerConfig: TConfigType;
}) => Awaitable<null | undefined | AutomodTriggerMatchResult<TMatchResultExtra>>;

type AutomodTriggerRenderMatchInformationFn<TConfigType, TMatchResultExtra> = (meta: {
  ruleName: string;
  pluginData: GuildPluginData<AutomodPluginType>;
  contexts: AutomodContext[];
  triggerConfig: TConfigType;
  matchResult: AutomodTriggerMatchResult<TMatchResultExtra>;
}) => Awaitable<string>;

export interface AutomodTriggerBlueprint<TConfigSchema extends ZodTypeAny, TMatchResultExtra> {
  configSchema: TConfigSchema;
  match: AutomodTriggerMatchFn<z.output<TConfigSchema>, TMatchResultExtra>;
  renderMatchInformation: AutomodTriggerRenderMatchInformationFn<z.output<TConfigSchema>, TMatchResultExtra>;
}

export function automodTrigger<TMatchResultExtra>(): <TConfigSchema extends ZodTypeAny>(
  blueprint: AutomodTriggerBlueprint<TConfigSchema, TMatchResultExtra>,
) => AutomodTriggerBlueprint<TConfigSchema, TMatchResultExtra>;

export function automodTrigger<TConfigSchema extends ZodTypeAny>(
  blueprint: AutomodTriggerBlueprint<TConfigSchema, unknown>,
): AutomodTriggerBlueprint<TConfigSchema, unknown>;

export function automodTrigger(...args) {
  if (args.length) {
    return args[0];
  } else {
    return automodTrigger;
  }
}

type AutomodActionApplyFn<TConfigType> = (meta: {
  ruleName: string;
  pluginData: GuildPluginData<AutomodPluginType>;
  contexts: AutomodContext[];
  actionConfig: TConfigType;
  matchResult: AutomodTriggerMatchResult;
  prettyName: string | undefined;
}) => Awaitable<void>;

export interface AutomodActionBlueprint<TConfigSchema extends ZodTypeAny> {
  configSchema: TConfigSchema;
  apply: AutomodActionApplyFn<z.output<TConfigSchema>>;
}

export function automodAction<TConfigSchema extends ZodTypeAny>(
  blueprint: AutomodActionBlueprint<TConfigSchema>,
): AutomodActionBlueprint<TConfigSchema> {
  return blueprint;
}
