import { typedGuildEventListener } from "knub";
import { AutomodContext, AutomodPluginType } from "../types";
import { runAutomod } from "../functions/runAutomod";
import { noop } from "../../../utils";

export const RunAutomodOnVoiceStateUpdate = typedGuildEventListener<AutomodPluginType>()({
  event: "voiceStateUpdate",
  async listener({ pluginData, args: { newState, oldState } }) {
    const oldChannel = newState.channel;
    const { channel: newChannel, guild } = newState;
    const timestamp = Date.now();

    const member = newState.member ?? oldState.member ?? (await guild.members.fetch(newState.id).catch(noop));
    if (!member) return;

    if (!oldChannel && newChannel) {
      const context: AutomodContext = {
        member,
        timestamp,
        voiceChannel: {
          joined: newChannel,
        },
        user: member.user,
      };

      pluginData.state.queue.add(() => {
        runAutomod(pluginData, context);
      });
    } else if (oldChannel && !newChannel) {
      const context: AutomodContext = {
        member,
        timestamp,
        voiceChannel: {
          left: oldChannel,
        },
        user: member.user,
      };

      pluginData.state.queue.add(() => {
        runAutomod(pluginData, context);
      });
    } else if (oldChannel?.id && newChannel?.id && oldChannel.id === newChannel.id) {
      const context: AutomodContext = {
        member,
        timestamp,
        voiceChannel: {
          left: oldChannel,
          joined: newChannel,
        },
        user: member.user,
      };

      pluginData.state.queue.add(() => {
        runAutomod(pluginData, context);
      });
    }
  },
});
