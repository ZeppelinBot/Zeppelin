import { LogType } from "../../../data/LogType";
import { differenceToString, getScalarDifference } from "../../../utils";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { logsEvt } from "../types";
import { logChannelCreate } from "../logFunctions/logChannelCreate";
import { logChannelDelete } from "../logFunctions/logChannelDelete";
import { logChannelUpdate } from "../logFunctions/logChannelUpdate";
import { TextChannel, VoiceChannel } from "discord.js";
import { filterObject } from "../../../utils/filterObject";

export const LogsChannelCreateEvt = logsEvt({
  event: "channelCreate",

  async listener(meta) {
    logChannelCreate(meta.pluginData, {
      channel: meta.args.channel,
    });
  },
});

export const LogsChannelDeleteEvt = logsEvt({
  event: "channelDelete",

  async listener(meta) {
    logChannelDelete(meta.pluginData, {
      channel: meta.args.channel,
    });
  },
});

const validChannelDiffProps: Set<keyof TextChannel | keyof VoiceChannel> = new Set([
  "name",
  "parentId",
  "nsfw",
  "rateLimitPerUser",
  "topic",
  "bitrate",
]);

export const LogsChannelUpdateEvt = logsEvt({
  event: "channelUpdate",

  async listener(meta) {
    if (meta.args.oldChannel?.partial) {
      return;
    }

    const oldChannelDiffProps = filterObject(meta.args.oldChannel || {}, (v, k) => validChannelDiffProps.has(k));
    const newChannelDiffProps = filterObject(meta.args.newChannel, (v, k) => validChannelDiffProps.has(k));
    const diff = getScalarDifference(oldChannelDiffProps, newChannelDiffProps);
    const differenceString = differenceToString(diff);

    if (differenceString.trim() === "") {
      return;
    }

    logChannelUpdate(meta.pluginData, {
      oldChannel: meta.args.oldChannel,
      newChannel: meta.args.newChannel,
      differenceString,
    });
  },
});
