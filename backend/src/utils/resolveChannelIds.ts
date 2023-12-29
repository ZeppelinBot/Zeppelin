import { CategoryChannel, Channel } from "discord.js";
import { isDmChannel } from "./isDmChannel";
import { isGuildChannel } from "./isGuildChannel";
import { isThreadChannel } from "./isThreadChannel";

type ResolvedChannelIds = {
  category: string | null;
  channel: string | null;
  thread: string | null;
};

export function resolveChannelIds(channel: Channel): ResolvedChannelIds {
  if (isDmChannel(channel)) {
    return {
      category: null,
      channel: channel.id,
      thread: null,
    };
  }

  if (isThreadChannel(channel)) {
    return {
      category: channel.parent?.parentId || null,
      channel: channel.parentId,
      thread: channel.id,
    };
  }

  if (channel instanceof CategoryChannel) {
    return {
      category: channel.id,
      channel: null,
      thread: null,
    };
  }

  if (isGuildChannel(channel)) {
    return {
      category: channel.parentId,
      channel: channel.id,
      thread: null,
    };
  }

  return {
    category: null,
    channel: channel.id,
    thread: null,
  };
}
