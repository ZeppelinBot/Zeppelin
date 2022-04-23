import { PermissionFlags } from "discord.js";
import { EMPTY_CHAR } from "../utils";

export const PERMISSION_NAMES: Record<keyof PermissionFlags, string> = {
  ADD_REACTIONS: "Add Reactions",
  ADMINISTRATOR: "Administrator",
  ATTACH_FILES: "Attach Files",
  BAN_MEMBERS: "Ban Members",
  CHANGE_NICKNAME: "Change Nickname",
  CONNECT: "Connect",
  CREATE_INSTANT_INVITE: "Create Invite",
  CREATE_PRIVATE_THREADS: "Create Private Threads",
  CREATE_PUBLIC_THREADS: "Create Public Threads",
  DEAFEN_MEMBERS: "Deafen Members",
  EMBED_LINKS: "Embed Links",
  KICK_MEMBERS: "Kick Members",
  MANAGE_CHANNELS: "Manage Channels",
  MANAGE_EMOJIS_AND_STICKERS: "Manage Emojis and Stickers",
  MANAGE_GUILD: "Manage Server",
  MANAGE_MESSAGES: "Manage Messages",
  MANAGE_NICKNAMES: "Manage Nicknames",
  MANAGE_ROLES: "Manage Roles",
  MANAGE_THREADS: "Manage Threads",
  MANAGE_WEBHOOKS: "Manage Webhooks",
  MENTION_EVERYONE: `Mention @${EMPTY_CHAR}everyone, @${EMPTY_CHAR}here, and All Roles`,
  MOVE_MEMBERS: "Move Members",
  MUTE_MEMBERS: "Mute Members",
  PRIORITY_SPEAKER: "Priority Speaker",
  READ_MESSAGE_HISTORY: "Read Message History",
  REQUEST_TO_SPEAK: "Request to Speak",
  SEND_MESSAGES: "Send Messages",
  SEND_MESSAGES_IN_THREADS: "Send Messages in Threads",
  SEND_TTS_MESSAGES: "Send Text-To-Speech Messages",
  SPEAK: "Speak",
  START_EMBEDDED_ACTIVITIES: "Start Embedded Activities",
  STREAM: "Video",
  USE_APPLICATION_COMMANDS: "Use Application Commands",
  USE_EXTERNAL_EMOJIS: "Use External Emoji",
  USE_EXTERNAL_STICKERS: "Use External Stickers",
  USE_PRIVATE_THREADS: "Use Private Threads",
  USE_PUBLIC_THREADS: "Use Public Threads",
  USE_VAD: "Use Voice Activity",
  VIEW_AUDIT_LOG: "View Audit Log",
  VIEW_CHANNEL: "View Channels",
  VIEW_GUILD_INSIGHTS: "View Guild Insights",
  MODERATE_MEMBERS: "Moderate Members",
  MANAGE_EVENTS: "Manage Events",
};
