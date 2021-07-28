import {
  GuildChannel,
  GuildMember,
  PartialGuildMember,
  Role,
  Snowflake,
  StageInstance,
  ThreadChannel,
  User,
} from "discord.js";
import { UnknownUser } from "src/utils";

export interface IConfigAccessibleUser {
  id: Snowflake | string;
  username: string;
  discriminator: string;
  mention: string;
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
  if (`${user.tag}` === "Unknown#0000") {
    const toReturnPartial: IConfigAccessibleUser = {
      id: user.id,
      username: "Unknown",
      discriminator: "0000",
      mention: `<@${user.id}>`,
    };

    return toReturnPartial;
  }

  const properUser = user as User;
  const toReturn: IConfigAccessibleUser = {
    id: properUser.id,
    username: properUser.username,
    discriminator: properUser.discriminator,
    mention: `<@${properUser.id}>`,
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
    roles: member.roles.cache.mapValues(r => roleToConfigAccessibleRole(r)).array(),
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
