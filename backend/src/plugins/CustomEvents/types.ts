import { BasePluginType, pluginUtils } from "knub";
import z from "zod";
import { zBoundedCharacters, zBoundedRecord } from "../../utils";
import { zAddRoleAction } from "./actions/addRoleAction";
import { zCreateCaseAction } from "./actions/createCaseAction";
import { zMakeRoleMentionableAction } from "./actions/makeRoleMentionableAction";
import { zMakeRoleUnmentionableAction } from "./actions/makeRoleUnmentionableAction";
import { zMessageAction } from "./actions/messageAction";
import { zMoveToVoiceChannelAction } from "./actions/moveToVoiceChannelAction";
import { zSetChannelPermissionOverridesAction } from "./actions/setChannelPermissionOverrides";
import { CommonPlugin } from "../Common/CommonPlugin";

const zCommandTrigger = z.strictObject({
  type: z.literal("command"),
  name: zBoundedCharacters(0, 100),
  params: zBoundedCharacters(0, 255),
  can_use: z.boolean(),
});

const zAnyTrigger = zCommandTrigger; // TODO: Make into a union once we have more triggers

const zAnyAction = z.union([
  zAddRoleAction,
  zCreateCaseAction,
  zMoveToVoiceChannelAction,
  zMessageAction,
  zMakeRoleMentionableAction,
  zMakeRoleUnmentionableAction,
  zSetChannelPermissionOverridesAction,
]);

export const zCustomEvent = z.strictObject({
  name: zBoundedCharacters(0, 100),
  trigger: zAnyTrigger,
  actions: z.array(zAnyAction).max(10),
});
export type TCustomEvent = z.infer<typeof zCustomEvent>;

export const zCustomEventsConfig = z.strictObject({
  events: zBoundedRecord(z.record(zBoundedCharacters(0, 100), zCustomEvent), 0, 100),
});

export interface CustomEventsPluginType extends BasePluginType {
  config: z.infer<typeof zCustomEventsConfig>;
  state: {
    clearTriggers: () => void;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}
