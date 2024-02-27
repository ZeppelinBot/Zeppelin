import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { renderUsername } from "../../utils";
import { UsernameSaverPluginType } from "./types";

export async function updateUsername(pluginData: GuildPluginData<UsernameSaverPluginType>, user: User) {
  if (!user) return;
  const newUsername = renderUsername(user);
  const latestEntry = await pluginData.state.usernameHistory.getLastEntry(user.id);
  if (!latestEntry || newUsername !== latestEntry.username) {
    await pluginData.state.usernameHistory.addEntry(user.id, newUsername);
  }
}
