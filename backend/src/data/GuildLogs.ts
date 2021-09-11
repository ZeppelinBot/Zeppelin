import * as events from "events";
import { LogType } from "./LogType";

// Use the same instance for the same guild, even if a new instance is created
const guildInstances: Map<string, GuildLogs> = new Map();

interface IIgnoredLog {
  type: LogType;
  ignoreId: any;
}

export class GuildLogs extends events.EventEmitter {
  protected guildId: string;
  protected ignoredLogs: IIgnoredLog[];

  constructor(guildId) {
    if (guildInstances.has(guildId)) {
      // Return existing instance for this guild if one exists
      return guildInstances.get(guildId)!;
    }

    super();
    this.guildId = guildId;
    this.ignoredLogs = [];

    // Store the instance for this guild so it can be returned later if a new instance for this guild is requested
    guildInstances.set(guildId, this);
  }

  log(type: LogType, data: any, ignoreId?: string) {
    if (ignoreId && this.isLogIgnored(type, ignoreId)) {
      this.clearIgnoredLog(type, ignoreId);
      return;
    }

    this.emit("log", { type, data });
  }

  ignoreLog(type: LogType, ignoreId: any, timeout?: number) {
    this.ignoredLogs.push({ type, ignoreId });

    // Clear after expiry (15sec by default)
    setTimeout(() => {
      this.clearIgnoredLog(type, ignoreId);
    }, timeout || 1000 * 15);
  }

  isLogIgnored(type: LogType, ignoreId: any) {
    return this.ignoredLogs.some((info) => type === info.type && ignoreId === info.ignoreId);
  }

  clearIgnoredLog(type: LogType, ignoreId: any) {
    this.ignoredLogs.splice(
      this.ignoredLogs.findIndex((info) => type === info.type && ignoreId === info.ignoreId),
      1,
    );
  }
}
