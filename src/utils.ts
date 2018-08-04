import at = require("lodash.at");
import { Client, Guild, GuildAuditLogEntry, Message, TextChannel } from "eris";
import url from "url";
import tlds from "tlds";
import emojiRegex from "emoji-regex";

/**
 * Turns a "delay string" such as "1h30m" to milliseconds
 * @param {String} str
 * @returns {Number}
 */
export function convertDelayStringToMS(str) {
  const regex = /^([0-9]+)\s*([dhms])?[a-z]*\s*/;
  let match;
  let ms = 0;

  str = str.trim();

  // tslint:disable-next-line
  while (str !== "" && (match = str.match(regex)) !== null) {
    if (match[2] === "d") ms += match[1] * 1000 * 60 * 60 * 24;
    else if (match[2] === "h") ms += match[1] * 1000 * 60 * 60;
    else if (match[2] === "s") ms += match[1] * 1000;
    else if (match[2] === "m" || !match[2]) ms += match[1] * 1000 * 60;

    str = str.slice(match[0].length);
  }

  // Invalid delay string
  if (str !== "") {
    return null;
  }

  return ms;
}

export function successMessage(str) {
  return `👌 ${str}`;
}

export function errorMessage(str) {
  return `⚠ ${str}`;
}

export function uclower(str) {
  return str[0].toLowerCase() + str.slice(1);
}

export function stripObjectToScalars(obj, includedNested: string[] = []) {
  const result = {};

  for (const key in obj) {
    if (
      obj[key] == null ||
      typeof obj[key] === "string" ||
      typeof obj[key] === "number" ||
      typeof obj[key] === "boolean"
    ) {
      result[key] = obj[key];
    } else if (typeof obj[key] === "object") {
      const prefix = `${key}.`;
      const nestedNested = includedNested
        .filter(p => p === key || p.startsWith(prefix))
        .map(p => (p === key ? p : p.slice(prefix.length)));

      if (nestedNested.length) {
        result[key] = stripObjectToScalars(obj[key], nestedNested);
      }
    }
  }

  return result;
}

const stringFormatRegex = /{([^{}]+?)}/g;
export function formatTemplateString(str: string, values) {
  return str.replace(stringFormatRegex, (match, prop) => {
    const value = at(values, prop)[0];
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
  });
}

export function isSnowflake(v: string): boolean {
  return /^\d{17,20}$/.test(v);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Attempts to find a relevant audit log entry for the given user and action
 */
export async function findRelevantAuditLogEntry(
  guild: Guild,
  actionType: number,
  userId: string,
  attempts: number = 3,
  attemptDelay: number = 3000
): Promise<GuildAuditLogEntry> {
  const auditLogEntries = await guild.getAuditLogs(5, null, actionType);

  auditLogEntries.entries.sort((a, b) => {
    if (a.createdAt > b.createdAt) return -1;
    if (a.createdAt > b.createdAt) return 1;
    return 0;
  });

  const cutoffTS = Date.now() - 1000 * 60 * 2;

  const relevantEntry = auditLogEntries.entries.find(entry => {
    return entry.targetID === userId && entry.createdAt >= cutoffTS;
  });

  if (relevantEntry) {
    return relevantEntry;
  } else if (attempts > 0) {
    await sleep(attemptDelay);
    return findRelevantAuditLogEntry(guild, actionType, userId, attempts - 1, attemptDelay);
  } else {
    return null;
  }
}

const urlRegex = /(\S+\.\S+)/g;
const protocolRegex = /^[a-z]+:\/\//;

export function getUrlsInString(str: string): url.URL[] {
  const matches = str.match(urlRegex) || [];
  return matches.reduce((urls, match) => {
    if (!protocolRegex.test(match)) {
      match = `https://${match}`;
    }

    let matchUrl: url.URL;
    try {
      matchUrl = new url.URL(match);
    } catch (e) {
      return urls;
    }

    const hostnameParts = matchUrl.hostname.split(".");
    const tld = hostnameParts[hostnameParts.length - 1];
    if (tlds.includes(tld)) {
      urls.push(matchUrl);
    }

    return urls;
  }, []);
}

export function getInviteCodesInString(str: string): string[] {
  const inviteCodeRegex = /(?:discord.gg|discordapp.com\/invite)\/([a-z0-9]+)/gi;
  const inviteCodes = [];
  let match;

  // tslint:disable-next-line
  while ((match = inviteCodeRegex.exec(str)) !== null) {
    inviteCodes.push(match[1]);
  }

  return inviteCodes;
}

export const unicodeEmojiRegex = emojiRegex();
export const customEmojiRegex = /<:(?:.*?):(\d+)>/g;
export const anyEmojiRegex = new RegExp(
  `(?:(?:${unicodeEmojiRegex.source})|(?:${customEmojiRegex.source}))`,
  "g"
);

export function getEmojiInString(str: string): string[] {
  return str.match(anyEmojiRegex) || [];
}

export type MessageFilterFn = (msg: Message) => boolean;
export type StopFn = (msg: Message) => boolean;

export async function getMessages(
  channel: TextChannel,
  filter: MessageFilterFn = null,
  maxCount: number = 50,
  stopFn: StopFn = null
): Promise<Message[]> {
  let messages: Message[] = [];
  let before;

  if (!filter) {
    filter = () => true;
  }

  while (true) {
    const newMessages = await channel.getMessages(50, before);
    if (newMessages.length === 0) break;

    before = newMessages[newMessages.length - 1].id;

    const filtered = newMessages.filter(filter);
    messages.push(...filtered);

    if (messages.length >= maxCount) {
      messages = messages.slice(0, maxCount);
      break;
    }

    if (stopFn && newMessages.some(stopFn)) {
      break;
    }
  }

  return messages;
}

export async function cleanMessagesInChannel(
  bot: Client,
  channel: TextChannel,
  count: number,
  userId: string = null,
  reason: string = null
) {
  const messages = await getMessages(channel, msg => !userId || msg.author.id === userId, count);
  const ids = messages.map(m => m.id);
  if (ids) {
    await bot.deleteMessages(channel.id, ids, reason);
  }
}

export function trimLines(str: string) {
  return str
    .trim()
    .split("\n")
    .map(l => l.trim())
    .join("\n")
    .trim();
}

export const emptyEmbedValue = "\u200b";
export const embedPadding = "\n" + emptyEmbedValue;

export const userMentionRegex = /<@!?([0-9]+)>/g;
export const roleMentionRegex = /<&([0-9]+)>/g;

export function getUserMentions(str: string) {
  const regex = new RegExp(userMentionRegex.source, "g");
  const userIds = [];
  let match;

  // tslint:disable-next-line
  while ((match = regex.exec(str)) !== null) {
    userIds.push(match[1]);
  }

  return userIds;
}

export function getRoleMentions(str: string) {
  const regex = new RegExp(roleMentionRegex.source, "g");
  const roleIds = [];
  let match;

  // tslint:disable-next-line
  while ((match = regex.exec(str)) !== null) {
    roleIds.push(match[1]);
  }

  return roleIds;
}

/**
 * Disables link previews in the given string by wrapping links in < >
 */
export function disableLinkPreviews(str: string): string {
  return str.replace(/(?<!\<)(https?:\/\/\S+)/gi, "<$1>");
}

export const DBDateFormat = "YYYY-MM-DD HH:mm:ss";
