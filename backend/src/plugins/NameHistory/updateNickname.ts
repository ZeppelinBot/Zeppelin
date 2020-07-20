import { Member } from "eris";
import { PluginData } from "knub";
import { NameHistoryPluginType } from "./types";

export async function updateNickname(pluginData: PluginData<NameHistoryPluginType>, member: Member) {
  if (!member) return;
  const latestEntry = await pluginData.state.nicknameHistory.getLastEntry(member.id);
  if (!latestEntry || latestEntry.nickname !== member.nick) {
    if (!latestEntry && member.nick == null) return; // No need to save "no nickname" if there's no previous data
    await pluginData.state.nicknameHistory.addEntry(member.id, member.nick);
  }
}
