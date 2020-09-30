import { GuildPluginData } from "knub";
import { AutoDeletePluginType } from "../types";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { scheduleNextDeletion } from "./scheduleNextDeletion";
import { sorter } from "../../../utils";

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
