import * as t from "io-ts";
import { BasePluginType } from "knub";
import { AddRoleAction } from "./actions/addRoleAction";
import { CreateCaseAction } from "./actions/createCaseAction";
import { MakeRoleMentionableAction } from "./actions/makeRoleMentionableAction";
import { MakeRoleUnmentionableAction } from "./actions/makeRoleUnmentionableAction";
import { MessageAction } from "./actions/messageAction";
import { MoveToVoiceChannelAction } from "./actions/moveToVoiceChannelAction";
import { SetChannelPermissionOverridesAction } from "./actions/setChannelPermissionOverrides";

// Triggers
const CommandTrigger = t.type({
  type: t.literal("command"),
  name: t.string,
  params: t.string,
  can_use: t.boolean,
});
type TCommandTrigger = t.TypeOf<typeof CommandTrigger>;

const AnyTrigger = CommandTrigger; // TODO: Make into a union once we have more triggers
type TAnyTrigger = t.TypeOf<typeof AnyTrigger>;

const AnyAction = t.union([
  AddRoleAction,
  CreateCaseAction,
  MoveToVoiceChannelAction,
  MessageAction,
  MakeRoleMentionableAction,
  MakeRoleUnmentionableAction,
  SetChannelPermissionOverridesAction,
]);
type TAnyAction = t.TypeOf<typeof AnyAction>;

export const CustomEvent = t.type({
  name: t.string,
  trigger: AnyTrigger,
  actions: t.array(AnyAction),
});
export type TCustomEvent = t.TypeOf<typeof CustomEvent>;

export const ConfigSchema = t.type({
  events: t.record(t.string, CustomEvent),
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface CustomEventsPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    clearTriggers: () => void;
  };
}
