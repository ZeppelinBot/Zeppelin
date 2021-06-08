import { Message, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { sendErrorMessage } from "../../../pluginUtils";
import { ActionError } from "../ActionError";
import { addRoleAction } from "../actions/addRoleAction";
import { createCaseAction } from "../actions/createCaseAction";
import { makeRoleMentionableAction } from "../actions/makeRoleMentionableAction";
import { makeRoleUnmentionableAction } from "../actions/makeRoleUnmentionableAction";
import { messageAction } from "../actions/messageAction";
import { moveToVoiceChannelAction } from "../actions/moveToVoiceChannelAction";
import { setChannelPermissionOverridesAction } from "../actions/setChannelPermissionOverrides";
import { CustomEventsPluginType, TCustomEvent } from "../types";

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
        sendErrorMessage(pluginData, (eventData.msg as Message).channel as TextChannel, e.message);
      } else {
        // TODO: Where to log action errors from other kinds of triggers?
      }

      return;
    }

    throw e;
  }
}
