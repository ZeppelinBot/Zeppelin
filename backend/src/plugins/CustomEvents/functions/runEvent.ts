import { GuildPluginData } from "knub";
import { CustomEventsPluginType, TCustomEvent } from "../types";
import { sendErrorMessage } from "../../../pluginUtils";
import { ActionError } from "../ActionError";
import { Message } from "eris";
import { addRoleAction } from "../actions/addRoleAction";
import { createCaseAction } from "../actions/createCaseAction";
import { moveToVoiceChannelAction } from "../actions/moveToVoiceChannelAction";
import { messageAction } from "../actions/messageAction";
import { makeRoleMentionableAction } from "../actions/makeRoleMentionableAction";
import { makeRoleUnmentionableAction } from "../actions/makeRoleUnmentionableAction";
import { setChannelPermissionOverridesAction } from "../actions/setChannelPermissionOverrides";

export async function runEvent(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  event: TCustomEvent,
  eventData: any,
  values: any,
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
        sendErrorMessage(pluginData, (eventData.msg as Message).channel, e.message);
      } else {
        // TODO: Where to log action errors from other kinds of triggers?
      }

      return;
    }

    throw e;
  }
}
