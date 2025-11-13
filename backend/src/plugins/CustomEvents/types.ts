import { BasePluginType, pluginUtils } from "vety";
import { z } from "zod";
import { zBoundedCharacters, zBoundedRecord } from "../../utils.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { zAddRoleAction } from "./actions/addRoleAction.js";
import { zCreateCaseAction } from "./actions/createCaseAction.js";
import { zMakeRoleMentionableAction } from "./actions/makeRoleMentionableAction.js";
import { zMakeRoleUnmentionableAction } from "./actions/makeRoleUnmentionableAction.js";
import { zMessageAction } from "./actions/messageAction.js";
import { zMoveToVoiceChannelAction } from "./actions/moveToVoiceChannelAction.js";
import { zSetChannelPermissionOverridesAction } from "./actions/setChannelPermissionOverrides.js";

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
  events: zBoundedRecord(z.record(zBoundedCharacters(0, 100), zCustomEvent), 0, 100).default({}),
});

export interface CustomEventsPluginType extends BasePluginType {
  configSchema: typeof zCustomEventsConfig;
  state: {
    clearTriggers: () => void;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}
