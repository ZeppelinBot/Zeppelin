import * as t from "io-ts";
import { BasePluginType, typedGuildCommand, typedGuildEventListener } from "knub";
import { GuildContextMenuLinks } from "../../data/GuildContextMenuLinks";
import { tNullable } from "../../utils";
import { AvailableActions } from "./actions/availableActions";

export enum ContextMenuTypes {
  USER = 2,
  MESSAGE = 3,
}

export const ContextMenuTypeNameToNumber: Record<string, number> = {
  USER: 2,
  MESSAGE: 3,
};

const ContextActionOpts = t.type({
  enabled: tNullable(t.boolean),
  label: t.string,
  type: t.keyof(ContextMenuTypes),
  action: t.partial(AvailableActions.props),
});
export type TContextActionOpts = t.TypeOf<typeof ContextActionOpts>;

export const ConfigSchema = t.type({
  context_actions: t.record(t.string, ContextActionOpts),
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface ContextMenuPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    contextMenuLinks: GuildContextMenuLinks;
  };
}

export const contextMenuCmd = typedGuildCommand<ContextMenuPluginType>();
export const contextMenuEvt = typedGuildEventListener<ContextMenuPluginType>();
