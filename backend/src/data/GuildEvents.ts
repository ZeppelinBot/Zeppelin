import { QueuedEventEmitter } from "../QueuedEventEmitter";
import { BaseGuildRepository } from "./BaseGuildRepository";

export class GuildEvents extends BaseGuildRepository {
  private queuedEventEmitter: QueuedEventEmitter;
  private pluginListeners: Map<string, Map<string, any[]>>;

  constructor(guildId) {
    super(guildId);
    this.queuedEventEmitter = new QueuedEventEmitter();
  }

  public on(pluginName: string, eventName: string, fn) {
    this.queuedEventEmitter.on(eventName, fn);

    if (!this.pluginListeners.has(pluginName)) {
      this.pluginListeners.set(pluginName, new Map());
    }

    const pluginListeners = this.pluginListeners.get(pluginName)!;
    if (!pluginListeners.has(eventName)) {
      pluginListeners.set(eventName, []);
    }

    const pluginEventListeners = pluginListeners.get(eventName)!;
    pluginEventListeners.push(fn);
  }

  public offPlugin(pluginName: string) {
    const pluginListeners = this.pluginListeners.get(pluginName) || new Map();
    for (const [eventName, listeners] of Array.from(pluginListeners.entries())) {
      for (const listener of listeners) {
        this.queuedEventEmitter.off(eventName, listener);
      }
    }
    this.pluginListeners.delete(pluginName);
  }

  public emit(eventName: string, args: any[] = []) {
    return this.queuedEventEmitter.emit(eventName, args);
  }
}
