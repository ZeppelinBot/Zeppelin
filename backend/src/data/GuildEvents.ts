import { Mute } from "./entities/Mute";
import { ScheduledPost } from "./entities/ScheduledPost";
import { Reminder } from "./entities/Reminder";

interface GuildEventArgs extends Record<string, unknown[]> {
  expiredMutes: [Mute[]];
  scheduledPosts: [ScheduledPost[]];
  reminders: [Reminder[]];
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
