import { GuildPluginData } from "vety";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { sorter } from "../../../utils.js";
import { AutoDeletePluginType } from "../types.js";
import { scheduleNextDeletion } from "./scheduleNextDeletion.js";

export function addMessageToDeletionQueue(
  pluginData: GuildPluginData<AutoDeletePluginType>,
  msg: SavedMessage,
  delay: number,
) {
  const deleteAt = Date.now() + delay;
  pluginData.state.deletionQueue.push({ deleteAt, message: msg });
  pluginData.state.deletionQueue.sort(sorter("deleteAt"));

  scheduleNextDeletion(pluginData);
}
