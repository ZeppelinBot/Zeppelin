import { SavedMessage } from "../../../data/entities/SavedMessage";
import { PluginData } from "knub";
import { AutomodContext, AutomodPluginType } from "../types";
import { runAutomod } from "../functions/runAutomod";
import { addRecentActionsFromMessage } from "../functions/addRecentActionsFromMessage";
import moment from "moment-timezone";

export function runAutomodOnMessage(pluginData: PluginData<AutomodPluginType>, message: SavedMessage, isEdit: boolean) {
  const context: AutomodContext = {
    timestamp: moment.utc(message.posted_at).valueOf(),
    message,
  };

  pluginData.state.queue.add(async () => {
    addRecentActionsFromMessage(pluginData, context);
    await runAutomod(pluginData, context);
  });
}
