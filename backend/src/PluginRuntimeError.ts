import util from "util";

export class PluginRuntimeError {
  public message: string;
  public pluginName: string;
  public guildId: string;

  constructor(message: string, pluginName: string, guildId: string) {
    this.message = message;
    this.pluginName = pluginName;
    this.guildId = guildId;
  }

  [util.inspect.custom](depth?, options?) {
    return `PRE [${this.pluginName}] [${this.guildId}] ${this.message}`;
  }

  toString() {
    return this[util.inspect.custom]();
  }
}
