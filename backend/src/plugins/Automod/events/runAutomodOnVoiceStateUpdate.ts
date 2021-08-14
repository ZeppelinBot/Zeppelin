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

    const context: AutomodContext = {
      member,
      timestamp,
      voiceChannel: {},
      user: member.user,
    };
    let addToQueue = false;

    if (!oldChannel && newChannel) {
      context.voiceChannel!.joined = newChannel;
      addToQueue = true;
    } else if (oldChannel && !newChannel) {
      context.voiceChannel!.left = oldChannel;
      addToQueue = true;
    } else if (oldChannel?.id && newChannel?.id && oldChannel.id === newChannel.id) {
      context.voiceChannel!.left = oldChannel;
      context.voiceChannel!.joined = newChannel;
      addToQueue = true;
    }

    if (addToQueue) {
      pluginData.state.queue.add(() => {
        runAutomod(pluginData, context);
      });
    }
  },
});
