import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { sorter } from "../../../utils";
import { AutoDeletePluginType } from "../types";
import { scheduleNextDeletion } from "./scheduleNextDeletion";

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
