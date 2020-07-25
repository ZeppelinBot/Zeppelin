import { PluginData } from "knub";
import { AutoDeletePluginType } from "../types";
import { SavedMessage } from "src/data/entities/SavedMessage";
import { scheduleNextDeletion } from "./scheduleNextDeletion";
import { sorter } from "src/utils";

export function addMessageToDeletionQueue(
  pluginData: PluginData<AutoDeletePluginType>,
  msg: SavedMessage,
  delay: number,
) {
  const deleteAt = Date.now() + delay;
  pluginData.state.deletionQueue.push({ deleteAt, message: msg });
  pluginData.state.deletionQueue.sort(sorter("deleteAt"));

  scheduleNextDeletion(pluginData);
}
