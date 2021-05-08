import { guildEventListener } from "knub";
import { AutomodContext, AutomodPluginType } from "../types";
import { runAutomod } from "../functions/runAutomod";

export const RunAutomodOnVoiceJoin = guildEventListener<AutomodPluginType>()(
  "voiceChannelJoin",
  ({ pluginData, args: { member, newChannel } }) => {
    const context: AutomodContext = {
      member,
      timestamp: Date.now(),
      voiceChannel: {
        joined: newChannel,
      },
      user: member.user,
    };

    pluginData.state.queue.add(() => {
      runAutomod(pluginData, context);
    });
  },
);

export const RunAutomodOnVoiceLeave = guildEventListener<AutomodPluginType>()(
  "voiceChannelLeave",
  ({ pluginData, args: { member, oldChannel } }) => {
    const context: AutomodContext = {
      member,
      timestamp: Date.now(),
      voiceChannel: {
        left: oldChannel,
      },
      user: member.user,
    };

    pluginData.state.queue.add(() => {
      runAutomod(pluginData, context);
    });
  },
);

export const RunAutomodOnVoiceSwitch = guildEventListener<AutomodPluginType>()(
  "voiceChannelSwitch",
  ({ pluginData, args: { member, oldChannel, newChannel } }) => {
    const context: AutomodContext = {
      member,
      timestamp: Date.now(),
      voiceChannel: {
        left: oldChannel,
        joined: newChannel,
      },
      user: member.user,
    };

    pluginData.state.queue.add(() => {
      runAutomod(pluginData, context);
    });
  },
);
