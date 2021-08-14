import {
  Emoji,
  GuildChannel,
  GuildMember,
  PartialGuildMember,
  Role,
  Snowflake,
  StageInstance,
  Sticker,
  ThreadChannel,
  User,
} from "discord.js";
import { UnknownUser } from "src/utils";
import { GuildPluginData } from "knub";

export interface IConfigAccessibleUser {
  id: Snowflake | string;
  username: string;
  discriminator: string;
  mention: string;
  tag: string;
  avatarURL?: string;
  bot?: boolean;
  createdAt?: number;
}

export interface IConfigAccessibleRole {
  id: Snowflake;
  name: string;
  createdAt: number;
  hexColor: string;
  hoist: boolean;
}

export interface IConfigAccessibleMember extends IConfigAccessibleUser {
  user: IConfigAccessibleUser;
  nick: string;
  roles: IConfigAccessibleRole[];
  joinedAt?: number;
  // guildAvatarURL: string, Once DJS supports per-server avatars
  guildName: string;
}

export function userToConfigAccessibleUser(user: User | UnknownUser): IConfigAccessibleUser {
  if (user.tag === "Unknown#0000") {
    const toReturnPartial: IConfigAccessibleUser = {
      id: user.id,
      username: "Unknown",
      discriminator: "0000",
      mention: `<@${user.id}>`,
      tag: "Unknown#0000",
    };

    return toReturnPartial;
  }

  const properUser = user as User;
  const toReturn: IConfigAccessibleUser = {
    id: properUser.id,
    username: properUser.username,
    discriminator: properUser.discriminator,
    mention: `<@${properUser.id}>`,
    tag: properUser.tag,
    avatarURL: properUser.displayAvatarURL({ dynamic: true }),
    bot: properUser.bot,
    createdAt: properUser.createdTimestamp,
  };

  return toReturn;
}

export function roleToConfigAccessibleRole(role: Role): IConfigAccessibleRole {
  const toReturn: IConfigAccessibleRole = {
    id: role.id,
    name: role.name,
    createdAt: role.createdTimestamp,
    hexColor: role.hexColor,
    hoist: role.hoist,
  };

  return toReturn;
}

export function memberToConfigAccessibleMember(member: GuildMember | PartialGuildMember): IConfigAccessibleMember {
  const user = userToConfigAccessibleUser(member.user!);

  const toReturn: IConfigAccessibleMember = {
    ...user,
    user,
    nick: member.nickname ?? "*None*",
    roles: [...member.roles.cache.mapValues(r => roleToConfigAccessibleRole(r)).values()],
    joinedAt: member.joinedTimestamp ?? undefined,
    guildName: member.guild.name,
  };

  return toReturn;
}

export interface IConfigAccessibleChannel {
  id: Snowflake;
  name: string;
  mention: string;
  parentId?: Snowflake;
}

export function channelToConfigAccessibleChannel(channel: GuildChannel | ThreadChannel): IConfigAccessibleChannel {
  const toReturn: IConfigAccessibleChannel = {
    id: channel.id,
    name: channel.name,
    mention: `<#${channel.id}>`,
    parentId: channel.parentId ?? undefined,
  };

  return toReturn;
}

export interface IConfigAccessibleStage {
  channelId: Snowflake;
  channelMention: string;
  createdAt: number;
  discoverable: boolean;
  topic: string;
}

export function stageToConfigAccessibleStage(stage: StageInstance): IConfigAccessibleStage {
  const toReturn: IConfigAccessibleStage = {
    channelId: stage.channelId,
    channelMention: `<#${stage.channelId}>`,
    createdAt: stage.createdTimestamp,
    discoverable: !stage.discoverableDisabled,
    topic: stage.topic,
  };

  return toReturn;
}

export interface IConfigAccessibleEmoji {
  id: Snowflake;
  name: string;
  createdAt?: number;
  animated: boolean;
  identifier: string;
}

export function emojiToConfigAccessibleEmoji(emoji: Emoji): IConfigAccessibleEmoji {
  const toReturn: IConfigAccessibleEmoji = {
    id: emoji.id!,
    name: emoji.name!,
    createdAt: emoji.createdTimestamp ?? undefined,
    animated: emoji.animated ?? false,
    identifier: emoji.identifier,
  };

  return toReturn;
}

export interface IConfigAccessibleSticker {
  id: Snowflake;
  guildId?: Snowflake;
  packId?: Snowflake;
  name: string;
  description: string;
  tags: string;
  format: string;
  animated: boolean;
  url: string;
}

export function stickerToConfigAccessibleSticker(sticker: Sticker): IConfigAccessibleSticker {
  const toReturn: IConfigAccessibleSticker = {
    id: sticker.id,
    guildId: sticker.guildId ?? undefined,
    packId: sticker.packId ?? undefined,
    name: sticker.name,
    description: sticker.description ?? "",
    tags: sticker.tags?.join(", ") ?? "",
    format: sticker.format,
    animated: sticker.format === "PNG" ? false : true,
    url: sticker.url,
  };

  return toReturn;
}

export function getConfigAccessibleMemberLevel(
  pluginData: GuildPluginData<any>,
  member: IConfigAccessibleMember,
): number {
  if (member.id === pluginData.guild.ownerId) {
    return 99999;
  }

  const levels = pluginData.fullConfig.levels ?? {};
  for (const [id, level] of Object.entries(levels)) {
    if (member.id === id || member.roles?.find(r => r.id === id)) {
      return level as number;
    }
  }

  return 0;
}
