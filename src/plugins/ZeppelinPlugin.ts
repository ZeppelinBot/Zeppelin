import { Plugin } from "knub";
import { PluginRuntimeError } from "../PluginRuntimeError";
import { TextableChannel } from "eris";
import { errorMessage, successMessage } from "../utils";

export class ZeppelinPlugin extends Plugin {
  protected throwPluginRuntimeError(message: string) {
    throw new PluginRuntimeError(message, this.pluginName, this.guildId);
  }
}
