import { SavedMessage } from "../../../data/entities/SavedMessage";
import { eventListener, PluginData } from "knub";
import { AutomodContext, AutomodPluginType } from "../types";
import { runAutomod } from "../functions/runAutomod";

export const RunAutomodOnJoinEvt = eventListener<AutomodPluginType>()(
  "guildMemberAdd",
  ({ pluginData, args: { member } }) => {
    const context: AutomodContext = {
      timestamp: Date.now(),
      user: member.user,
    };

    pluginData.state.queue.add(() => runAutomod(pluginData, context));
  },
);
