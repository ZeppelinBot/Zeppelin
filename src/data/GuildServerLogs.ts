import * as EventEmitter from "events";
import { LogType } from "./LogType";

// Use the same instance for the same guild, even if a new instance is created
const guildInstances: Map<string, GuildServerLogs> = new Map();

export class GuildServerLogs extends EventEmitter {
  protected guildId: string;

  constructor(guildId) {
    if (guildInstances.has(guildId)) {
      // Return existing instance for this guild if one exists
      return guildInstances.get(guildId);
    }

    super();
    this.guildId = guildId;

    // Store the instance for this guild so it can be returned later if a new instance for this guild is requested
    guildInstances.set(guildId, this);
  }

  log(type: LogType, data: any) {
    this.emit("log", { type, data });
  }
}
