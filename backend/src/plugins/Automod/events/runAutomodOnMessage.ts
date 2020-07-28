import { SavedMessage } from "../../../data/entities/SavedMessage";
import { PluginData } from "knub";
import { AutomodContext, AutomodPluginType } from "../types";
import { runAutomod } from "../functions/runAutomod";
import { addRecentActionsFromMessage } from "../functions/addRecentActionsFromMessage";
import moment from "moment-timezone";

export function runAutomodOnMessage(pluginData: PluginData<AutomodPluginType>, message: SavedMessage, isEdit: boolean) {
  const user = pluginData.client.users.get(message.user_id);
  const member = pluginData.guild.members.get(message.user_id);

  const context: AutomodContext = {
    timestamp: moment.utc(message.posted_at).valueOf(),
    message,
    user,
    member,
  };

  pluginData.state.queue.add(async () => {
    addRecentActionsFromMessage(pluginData, context);
    await runAutomod(pluginData, context);
  });
}
