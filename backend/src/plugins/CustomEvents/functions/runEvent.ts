import { GuildPluginData } from "vety";
import { TemplateSafeValueContainer } from "../../../templateFormatter.js";
import { ActionError } from "../ActionError.js";
import { addRoleAction } from "../actions/addRoleAction.js";
import { createCaseAction } from "../actions/createCaseAction.js";
import { makeRoleMentionableAction } from "../actions/makeRoleMentionableAction.js";
import { makeRoleUnmentionableAction } from "../actions/makeRoleUnmentionableAction.js";
import { messageAction } from "../actions/messageAction.js";
import { moveToVoiceChannelAction } from "../actions/moveToVoiceChannelAction.js";
import { setChannelPermissionOverridesAction } from "../actions/setChannelPermissionOverrides.js";
import { CustomEventsPluginType, TCustomEvent } from "../types.js";

export async function runEvent(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  event: TCustomEvent,
  eventData: any,
  values: TemplateSafeValueContainer,
) {
  try {
    for (const action of event.actions) {
      if (action.type === "add_role") {
        await addRoleAction(pluginData, action, values, event, eventData);
      } else if (action.type === "create_case") {
        await createCaseAction(pluginData, action, values, event, eventData);
      } else if (action.type === "move_to_vc") {
        await moveToVoiceChannelAction(pluginData, action, values, event, eventData);
      } else if (action.type === "message") {
        await messageAction(pluginData, action, values);
      } else if (action.type === "make_role_mentionable") {
        await makeRoleMentionableAction(pluginData, action, values, event, eventData);
      } else if (action.type === "make_role_unmentionable") {
        await makeRoleUnmentionableAction(pluginData, action, values, event, eventData);
      } else if (action.type === "set_channel_permission_overrides") {
        await setChannelPermissionOverridesAction(pluginData, action, values, event, eventData);
      }
    }
  } catch (e) {
    if (e instanceof ActionError) {
      if (event.trigger.type === "command") {
        void pluginData.state.common.sendErrorMessage(eventData.msg, e.message);
      } else {
        // TODO: Where to log action errors from other kinds of triggers?
      }

      return;
    }

    throw e;
  }
}
