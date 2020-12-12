let activeReload: [string, string] | null = null;

export function getActiveReload() {
  return activeReload;
}

export function setActiveReload(guildId: string, channelId: string) {
  activeReload = [guildId, channelId];
}

export function resetActiveReload() {
  activeReload = null;
}
