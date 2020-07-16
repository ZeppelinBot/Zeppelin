import { User } from "eris";
import { PluginData } from "knub";
import { UsernameSaverPluginType } from "./types";

export async function updateUsername(pluginData: PluginData<UsernameSaverPluginType>, user: User) {
  if (!user) return;
  const newUsername = `${user.username}#${user.discriminator}`;
  const latestEntry = await pluginData.state.usernameHistory.getLastEntry(user.id);
  if (!latestEntry || newUsername !== latestEntry.username) {
    await pluginData.state.usernameHistory.addEntry(user.id, newUsername);
  }
}
