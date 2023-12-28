import { Mute } from "./entities/Mute";
import { Reminder } from "./entities/Reminder";
import { ScheduledPost } from "./entities/ScheduledPost";
import { Tempban } from "./entities/Tempban";
import { VCAlert } from "./entities/VCAlert";

interface GuildEventArgs extends Record<string, unknown[]> {
  expiredMute: [Mute];
  timeoutMuteToRenew: [Mute];
  scheduledPost: [ScheduledPost];
  reminder: [Reminder];
  expiredTempban: [Tempban];
  expiredVCAlert: [VCAlert];
}

type GuildEvent = keyof GuildEventArgs;

type GuildEventListener<K extends GuildEvent> = (...args: GuildEventArgs[K]) => void;

type ListenerMap = {
  [K in GuildEvent]?: Array<GuildEventListener<K>>;
};

const guildListeners: Map<string, ListenerMap> = new Map();

/**
 * @return - Function to unregister the listener
 */
export function onGuildEvent<K extends GuildEvent>(
  guildId: string,
  eventName: K,
  listener: GuildEventListener<K>,
): () => void {
  if (!guildListeners.has(guildId)) {
    guildListeners.set(guildId, {});
  }
  const listenerMap = guildListeners.get(guildId)!;
  if (listenerMap[eventName] == null) {
    listenerMap[eventName] = [];
  }
  listenerMap[eventName]!.push(listener);

  return () => {
    listenerMap[eventName]!.splice(listenerMap[eventName]!.indexOf(listener), 1);
  };
}

export function emitGuildEvent<K extends GuildEvent>(guildId: string, eventName: K, args: GuildEventArgs[K]): void {
  if (!guildListeners.has(guildId)) {
    return;
  }
  const listenerMap = guildListeners.get(guildId)!;
  if (listenerMap[eventName] == null) {
    return;
  }
  for (const listener of listenerMap[eventName]!) {
    listener(...args);
  }
}

export function hasGuildEventListener<K extends GuildEvent>(guildId: string, eventName: K): boolean {
  if (!guildListeners.has(guildId)) {
    return false;
  }
  const listenerMap = guildListeners.get(guildId)!;
  if (listenerMap[eventName] == null || listenerMap[eventName]!.length === 0) {
    return false;
  }
  return true;
}
