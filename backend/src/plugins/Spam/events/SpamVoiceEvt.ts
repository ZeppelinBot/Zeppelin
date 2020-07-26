import { spamEvent, RecentActionType } from "../types";
import { logAndDetectOtherSpam } from "../util/logAndDetectOtherSpam";

export const SpamVoiceJoinEvt = spamEvent({
  event: "voiceChannelJoin",

  async listener(meta) {
    const member = meta.args.member;
    const channel = meta.args.newChannel;

    const config = meta.pluginData.config.getMatchingConfig({ member, channelId: channel.id });
    const maxVoiceMoves = config.max_voice_moves;
    if (maxVoiceMoves) {
      logAndDetectOtherSpam(
        meta.pluginData,
        RecentActionType.VoiceChannelMove,
        maxVoiceMoves,
        member.id,
        1,
        "0",
        Date.now(),
        null,
        "too many voice channel moves",
      );
    }
  },
});

export const SpamVoiceSwitchEvt = spamEvent({
  event: "voiceChannelSwitch",

  async listener(meta) {
    const member = meta.args.member;
    const channel = meta.args.newChannel;

    const config = meta.pluginData.config.getMatchingConfig({ member, channelId: channel.id });
    const maxVoiceMoves = config.max_voice_moves;
    if (maxVoiceMoves) {
      logAndDetectOtherSpam(
        meta.pluginData,
        RecentActionType.VoiceChannelMove,
        maxVoiceMoves,
        member.id,
        1,
        "0",
        Date.now(),
        null,
        "too many voice channel moves",
      );
    }
  },
});
