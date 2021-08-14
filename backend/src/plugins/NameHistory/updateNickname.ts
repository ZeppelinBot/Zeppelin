import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { NameHistoryPluginType } from "./types";

export async function updateNickname(pluginData: GuildPluginData<NameHistoryPluginType>, member: GuildMember) {
  if (!member) return;
  const latestEntry = await pluginData.state.nicknameHistory.getLastEntry(member.id);
  if (!latestEntry || latestEntry.nickname !== member.nickname) {
    if (!latestEntry && member.nickname == null) return; // No need to save "no nickname" if there's no previous data
    await pluginData.state.nicknameHistory.addEntry(member.id, member.nickname);
  }
}
