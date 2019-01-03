import { Plugin } from "knub";
import { PluginRuntimeError } from "../PluginRuntimeError";
import { TextableChannel } from "eris";
import { errorMessage, successMessage } from "../utils";

export class ZeppelinPlugin extends Plugin {
  protected throwPluginRuntimeError(message: string) {
    throw new PluginRuntimeError(message, this.runtimePluginName, this.guildId);
  }

  protected canActOn(member1, member2) {
    if (member1.id === member2.id) {
      return false;
    }

    const ourLevel = this.getMemberLevel(member1);
    const memberLevel = this.getMemberLevel(member2);
    return ourLevel > memberLevel;
  }
}
