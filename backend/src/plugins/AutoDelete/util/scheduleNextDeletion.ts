import { GuildPluginData } from "knub";
import { AutoDeletePluginType } from "../types";
import { deleteNextItem } from "./deleteNextItem";

export function scheduleNextDeletion(pluginData: GuildPluginData<AutoDeletePluginType>) {
  if (pluginData.state.deletionQueue.length === 0) {
    clearTimeout(pluginData.state.nextDeletionTimeout!);
    return;
  }

  const firstDeleteAt = pluginData.state.deletionQueue[0].deleteAt;
  clearTimeout(pluginData.state.nextDeletionTimeout!);
  pluginData.state.nextDeletionTimeout = setTimeout(() => deleteNextItem(pluginData), firstDeleteAt - Date.now());
}
