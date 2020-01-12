import {
  Attachment,
  Client,
  Embed,
  EmbedOptions,
  Emoji,
  Guild,
  GuildAuditLog,
  GuildAuditLogEntry,
  GuildChannel,
  Member,
  Message,
  MessageContent,
  TextableChannel,
  TextChannel,
  User,
} from "eris";
import DiscordHTTPError from "eris/lib/errors/DiscordHTTPError"; // tslint:disable-line
import url from "url";
import tlds from "tlds";
import emojiRegex from "emoji-regex";
import * as t from "io-ts";

import fs from "fs";
const fsp = fs.promises;

import https from "https";
import tmp from "tmp";
import { logger, waitForReaction } from "knub";
import { SavedMessage } from "./data/entities/SavedMessage";
import { decodeAndValidateStrict, StrictValidationError } from "./validatorUtils";
import { either } from "fp-ts/lib/Either";
import safeRegex from "safe-regex";
import moment from "moment-timezone";

const delayStringMultipliers = {
  w: 1000 * 60 * 60 * 24 * 7,
  d: 1000 * 60 * 60 * 24,
  h: 1000 * 60 * 60,
  m: 1000 * 60,
  s: 1000,
  x: 1,
};

export const MS = 1;
export const SECONDS = 1000 * MS;
export const MINUTES = 60 * SECONDS;
export const HOURS = 60 * MINUTES;
export const DAYS = 24 * HOURS;
export const WEEKS = 7 * 24 * HOURS;

export const EMPTY_CHAR = "\u200b";

export function tNullable<T extends t.Type<any, any>>(type: T) {
  return t.union([type, t.undefined, t.null], `Nullable<${type.name}>`);
}

function typeHasProps(type: any): type is t.TypeC<any> {
  return type.props != null;
}

function typeIsArray(type: any): type is t.ArrayC<any> {
  return type._tag === "ArrayType";
}

export type TDeepPartial<T> = T extends t.InterfaceType<any>
  ? TDeepPartialProps<T["props"]>
  : T extends t.DictionaryType<any, any>
  ? t.DictionaryType<T["domain"], TDeepPartial<T["codomain"]>>
  : T extends t.UnionType<any[]>
  ? t.UnionType<Array<TDeepPartial<T["types"][number]>>>
  : T extends t.IntersectionType<any>
  ? t.IntersectionType<Array<TDeepPartial<T["types"][number]>>>
  : T extends t.ArrayType<any>
  ? t.ArrayType<TDeepPartial<T["type"]>>
  : T;

// Based on t.PartialC
export interface TDeepPartialProps<P extends t.Props>
  extends t.PartialType<
    P,
    {
      [K in keyof P]?: TDeepPartial<t.TypeOf<P[K]>>;
    },
    {
      [K in keyof P]?: TDeepPartial<t.OutputOf<P[K]>>;
    }
  > {}

export function tDeepPartial<T>(type: T): TDeepPartial<T> {
  if (type instanceof t.InterfaceType) {
    const newProps = {};
    for (const [key, prop] of Object.entries(type.props)) {
      newProps[key] = tDeepPartial(prop);
    }
    return t.partial(newProps) as TDeepPartial<T>;
  } else if (type instanceof t.DictionaryType) {
    return t.record(type.domain, tDeepPartial(type.codomain)) as TDeepPartial<T>;
  } else if (type instanceof t.UnionType) {
    return t.union(type.types.map(unionType => tDeepPartial(unionType))) as TDeepPartial<T>;
  } else if (type instanceof t.IntersectionType) {
    const types = type.types.map(intersectionType => tDeepPartial(intersectionType));
    return (t.intersection(types as [t.Mixed, t.Mixed]) as unknown) as TDeepPartial<T>;
  } else if (type instanceof t.ArrayType) {
    return t.array(tDeepPartial(type.type)) as TDeepPartial<T>;
  } else {
    return type as TDeepPartial<T>;
  }
}

function tDeepPartialProp(prop: any) {
  if (typeHasProps(prop)) {
    return tDeepPartial(prop);
  } else if (typeIsArray(prop)) {
    return t.array(tDeepPartialProp(prop.type));
  } else {
    return prop;
  }
}

/**
 * Mirrors EmbedOptions from Eris
 */
export const tEmbed = t.type({
  title: tNullable(t.string),
  description: tNullable(t.string),
  url: tNullable(t.string),
  timestamp: tNullable(t.string),
  color: tNullable(t.number),
  footer: tNullable(
    t.type({
      text: t.string,
      icon_url: tNullable(t.string),
      proxy_icon_url: tNullable(t.string),
    }),
  ),
  image: tNullable(
    t.type({
      url: tNullable(t.string),
      proxy_url: tNullable(t.string),
      width: tNullable(t.number),
      height: tNullable(t.number),
    }),
  ),
  thumbnail: tNullable(
    t.type({
      url: tNullable(t.string),
      proxy_url: tNullable(t.string),
      width: tNullable(t.number),
      height: tNullable(t.number),
    }),
  ),
  video: tNullable(
    t.type({
      url: tNullable(t.string),
      width: tNullable(t.number),
      height: tNullable(t.number),
    }),
  ),
  provider: tNullable(
    t.type({
      name: t.string,
      url: tNullable(t.string),
    }),
  ),
  fields: tNullable(
    t.array(
      t.type({
        name: tNullable(t.string),
        value: tNullable(t.string),
        inline: tNullable(t.boolean),
      }),
    ),
  ),
  author: tNullable(
    t.type({
      name: t.string,
      url: tNullable(t.string),
      width: tNullable(t.number),
      height: tNullable(t.number),
    }),
  ),
});

export function dropPropertiesByName(obj, propName) {
  if (obj.hasOwnProperty(propName)) delete obj[propName];
  for (const value of Object.values(obj)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      dropPropertiesByName(value, propName);
    }
  }
}

export const tAlphanumeric = new t.Type<string, string>(
  "tAlphanumeric",
  (s): s is string => typeof s === "string",
  (from, to) =>
    either.chain(t.string.validate(from, to), s => {
      return s.match(/\W/) ? t.failure(from, to, "String must be alphanumeric") : t.success(s);
    }),
  s => s,
);

export const tDateTime = new t.Type<string, string>(
  "tDateTime",
  (s): s is string => typeof s === "string",
  (from, to) =>
    either.chain(t.string.validate(from, to), s => {
      const parsed =
        s.length === 10 ? moment(s, "YYYY-MM-DD") : s.length === 19 ? moment(s, "YYYY-MM-DD HH:mm:ss") : null;

      return parsed && parsed.isValid() ? t.success(s) : t.failure(from, to, "Invalid datetime");
    }),
  s => s,
);

export const tDelayString = new t.Type<string, string>(
  "tDelayString",
  (s): s is string => typeof s === "string",
  (from, to) =>
    either.chain(t.string.validate(from, to), s => {
      const ms = convertDelayStringToMS(s);
      return ms === null ? t.failure(from, to, "Invalid delay string") : t.success(s);
    }),
  s => s,
);

/**
 * Turns a "delay string" such as "1h30m" to milliseconds
 */
export function convertDelayStringToMS(str, defaultUnit = "m"): number {
  const regex = /^([0-9]+)\s*([wdhms])?[a-z]*\s*/;
  let match;
  let ms = 0;

  str = str.trim();

  // tslint:disable-next-line
  while (str !== "" && (match = str.match(regex)) !== null) {
    ms += match[1] * ((match[2] && delayStringMultipliers[match[2]]) || delayStringMultipliers[defaultUnit]);
    str = str.slice(match[0].length);
  }

  // Invalid delay string
  if (str !== "") {
    return null;
  }

  return ms;
}

export function convertMSToDelayString(ms: number): string {
  let result = "";
  let remaining = ms;
  for (const [abbr, multiplier] of Object.entries(delayStringMultipliers)) {
    if (multiplier <= remaining) {
      const amount = Math.floor(remaining / multiplier);
      result += `${amount}${abbr}`;
      remaining -= amount * multiplier;
    }

    if (remaining === 0) break;
  }
  return result;
}

export function successMessage(str, emoji = "<:zep_check:650361014180904971>") {
  return emoji ? `${emoji} ${str}` : str;
}

export function errorMessage(str, emoji = "⚠") {
  return emoji ? `${emoji} ${str}` : str;
}

export function get(obj, path, def?): any {
  let cursor = obj;
  const pathParts = path.split(".");
  for (const part of pathParts) {
    cursor = cursor[part];
    if (cursor === undefined) return def;
    if (cursor == null) return null;
  }
  return cursor;
}

export function has(obj, path): boolean {
  return get(obj, path) !== undefined;
}

export function stripObjectToScalars(obj, includedNested: string[] = []) {
  const result = Array.isArray(obj) ? [] : {};

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

export const snowflakeRegex = /[1-9][0-9]{5,19}/;

const isSnowflakeRegex = new RegExp(`^${snowflakeRegex.source}$`);
export function isSnowflake(v: string): boolean {
  return isSnowflakeRegex.test(v);
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
  attemptDelay: number = 3000,
): Promise<GuildAuditLogEntry> {
  let auditLogs: GuildAuditLog;
  try {
    auditLogs = await guild.getAuditLogs(5, null, actionType);
  } catch (e) {
    // Ignore internal server errors which seem to be pretty common with audit log requests
    if (!(e instanceof DiscordHTTPError) || e.code !== 500) {
      throw e;
    }
  }

  const entries = auditLogs ? auditLogs.entries : [];

  entries.sort((a, b) => {
    if (a.createdAt > b.createdAt) return -1;
    if (a.createdAt > b.createdAt) return 1;
    return 0;
  });

  const cutoffTS = Date.now() - 1000 * 60 * 2;

  const relevantEntry = entries.find(entry => {
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

export function getUrlsInString(str: string, unique = false): url.URL[] {
  let matches = str.match(urlRegex) || [];
  if (unique) matches = Array.from(new Set(matches));

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
  return Array.from(str.matchAll(inviteCodeRegex)).map(m => m[1]);
}

export const unicodeEmojiRegex = emojiRegex();
export const customEmojiRegex = /<a?:(.*?):(\d+)>/;

const matchAllEmojiRegex = new RegExp(`(${unicodeEmojiRegex.source})|(${customEmojiRegex.source})`, "g");

export function getEmojiInString(str: string): string[] {
  return str.match(matchAllEmojiRegex) || [];
}

export function isEmoji(str: string): boolean {
  return str.match(`^(${unicodeEmojiRegex.source})|(${customEmojiRegex.source})$`) !== null;
}

export function isUnicodeEmoji(str: string): boolean {
  return str.match(`^${unicodeEmojiRegex.source}$`) !== null;
}

export function trimLines(str: string) {
  return str
    .trim()
    .split("\n")
    .map(l => l.trim())
    .join("\n")
    .trim();
}

export function asSingleLine(str: string) {
  return trimLines(str).replace(/\n/g, " ");
}

export function trimEmptyStartEndLines(str: string) {
  const lines = str.split("\n");
  let emptyLinesAtStart = 0;
  let emptyLinesAtEnd = 0;

  for (const line of lines) {
    if (line.match(/^\s*$/)) {
      emptyLinesAtStart++;
    } else {
      break;
    }
  }

  for (let i = lines.length - 1; i > 0; i--) {
    if (lines[i].match(/^\s*$/)) {
      emptyLinesAtEnd++;
    } else {
      break;
    }
  }

  return lines.slice(emptyLinesAtStart, emptyLinesAtEnd ? -1 * emptyLinesAtEnd : null).join("\n");
}

export function trimIndents(str: string, indentLength: number) {
  return str
    .split("\n")
    .map(line => line.slice(indentLength))
    .join("\n");
}

export function indentLine(str: string, indentLength: number) {
  return " ".repeat(indentLength) + str;
}

export function indentLines(str: string, indentLength: number) {
  return str
    .split("\n")
    .map(line => indentLine(line, indentLength))
    .join("\n");
}

export const emptyEmbedValue = "\u200b";
export const embedPadding = "\n" + emptyEmbedValue;

export const userMentionRegex = /<@!?([0-9]+)>/g;
export const roleMentionRegex = /<@&([0-9]+)>/g;
export const channelMentionRegex = /<#([0-9]+)>/g;

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
 * Disable link previews in the given string by wrapping links in < >
 */
export function disableLinkPreviews(str: string): string {
  return str.replace(/(?<!<)(https?:\/\/\S+)/gi, "<$1>");
}

export function deactivateMentions(content: string): string {
  return content.replace(/@/g, "@\u200b");
}

/**
 * Disable inline code in the given string by replacing backticks/grave accents with acute accents
 * FIXME: Find a better way that keeps the grave accents? Can't use the code block approach here since it's just 1 character.
 */
export function disableInlineCode(content: string): string {
  return content.replace(/`/g, "\u00b4");
}

/**
 * Disable code blocks in the given string by adding invisible unicode characters between backticks
 */
export function disableCodeBlocks(content: string): string {
  return content.replace(/`/g, "`\u200b");
}

export function useMediaUrls(content: string): string {
  return content.replace(/cdn\.discordapp\.com/g, "media.discordapp.net");
}

export function chunkArray<T>(arr: T[], chunkSize): T[][] {
  const chunks: T[][] = [];
  let currentChunk = [];

  for (let i = 0; i < arr.length; i++) {
    currentChunk.push(arr[i]);
    if ((i !== 0 && i % chunkSize === 0) || i === arr.length - 1) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
  }

  return chunks;
}

export function chunkLines(str: string, maxChunkLength = 2000): string[] {
  if (str.length < maxChunkLength) {
    return [str];
  }

  const chunks = [];

  while (str.length) {
    if (str.length <= maxChunkLength) {
      chunks.push(str);
      break;
    }

    const slice = str.slice(0, maxChunkLength);

    const lastLineBreakIndex = slice.lastIndexOf("\n");
    if (lastLineBreakIndex === -1) {
      chunks.push(str.slice(0, maxChunkLength));
      str = str.slice(maxChunkLength);
    } else {
      chunks.push(str.slice(0, lastLineBreakIndex));
      str = str.slice(lastLineBreakIndex + 1);
    }
  }

  return chunks;
}

/**
 * Chunks a long message to multiple smaller messages, retaining leading and trailing line breaks, open code blocks, etc.
 */
export function chunkMessageLines(str: string): string[] {
  const chunks = chunkLines(str, 1990); // We don't split at exactly 2000 to be able to do the stuff below
  let openCodeBlock = false;

  return chunks.map(chunk => {
    // If the chunk starts with a newline, add an invisible unicode char so Discord doesn't strip it away
    if (chunk[0] === "\n") chunk = "\u200b" + chunk;
    // If the chunk ends with a newline, add an invisible unicode char so Discord doesn't strip it away
    if (chunk[chunk.length - 1] === "\n") chunk = chunk + "\u200b";
    // If the previous chunk had an open code block, open it here again
    if (openCodeBlock) {
      openCodeBlock = false;
      if (chunk.startsWith("```")) {
        // Edge case: chunk starts with a code block delimiter, e.g. the previous chunk and this one were split right before the end of a code block
        // Fix: just strip the code block delimiter away from here, we don't need it anymore
        chunk = chunk.slice(3);
      } else {
        chunk = "```" + chunk;
      }
    }
    // If the chunk has an open code block, close it and open it again in the next chunk
    const codeBlockDelimiters = chunk.match(/```/g);
    if (codeBlockDelimiters && codeBlockDelimiters.length % 2 !== 0) {
      chunk += "```";
      openCodeBlock = true;
    }

    return chunk;
  });
}

export async function createChunkedMessage(channel: TextableChannel, messageText: string) {
  const chunks = chunkMessageLines(messageText);
  for (const chunk of chunks) {
    await channel.createMessage(chunk);
  }
}

/**
 * Downloads the file from the given URL to a temporary file, with retry support
 */
export function downloadFile(attachmentUrl: string, retries = 3): Promise<{ path: string; deleteFn: () => void }> {
  return new Promise(resolve => {
    tmp.file((err, path, fd, deleteFn) => {
      if (err) throw err;

      const writeStream = fs.createWriteStream(path);

      https
        .get(attachmentUrl, res => {
          res.pipe(writeStream);
          writeStream.on("finish", () => {
            writeStream.end();
            resolve({
              path,
              deleteFn,
            });
          });
        })
        .on("error", httpsErr => {
          fsp.unlink(path);

          if (retries === 0) {
            throw httpsErr;
          } else {
            console.warn("File download failed, retrying. Error given:", httpsErr.message); // tslint:disable-line
            resolve(downloadFile(attachmentUrl, retries - 1));
          }
        });
    });
  });
}

type ItemWithRanking<T> = [T, number];
export function simpleClosestStringMatch<T>(searchStr, haystack: T[], getter = null): T {
  const normalizedSearchStr = searchStr.toLowerCase();

  // See if any haystack item contains a part of the search string
  const itemsWithRankings: Array<ItemWithRanking<T>> = haystack.map(item => {
    const itemStr: string = getter ? getter(item) : item;
    const normalizedItemStr = itemStr.toLowerCase();

    let i = 0;
    do {
      if (!normalizedItemStr.includes(normalizedSearchStr.slice(0, i + 1))) break;
      i++;
    } while (i < normalizedSearchStr.length);

    if (i > 0 && normalizedItemStr.startsWith(normalizedSearchStr.slice(0, i))) {
      // Slightly prioritize items that *start* with the search string
      i += 0.5;
    }

    return [item, i] as ItemWithRanking<T>;
  });

  // Sort by best match
  itemsWithRankings.sort((a, b) => {
    return a[1] > b[1] ? -1 : 1;
  });

  if (itemsWithRankings[0][1] === 0) {
    return null;
  }

  return itemsWithRankings[0][0];
}

type sorterDirection = "ASC" | "DESC";
type sorterGetterFn = (any) => any;
type sorterGetterFnWithDirection = [sorterGetterFn, sorterDirection];
type sorterGetterResolvable = string | sorterGetterFn;
type sorterGetterResolvableWithDirection = [sorterGetterResolvable, sorterDirection];
type sorterFn = (a: any, b: any) => number;

function resolveGetter(getter: sorterGetterResolvable): sorterGetterFn {
  if (typeof getter === "string") {
    return obj => obj[getter];
  }

  return getter;
}

export function multiSorter(getters: Array<sorterGetterResolvable | sorterGetterResolvableWithDirection>): sorterFn {
  const resolvedGetters: sorterGetterFnWithDirection[] = getters.map(getter => {
    if (Array.isArray(getter)) {
      return [resolveGetter(getter[0]), getter[1]] as sorterGetterFnWithDirection;
    } else {
      return [resolveGetter(getter), "ASC"] as sorterGetterFnWithDirection;
    }
  });

  return (a, b) => {
    for (const getter of resolvedGetters) {
      const aVal = getter[0](a);
      const bVal = getter[0](b);
      if (aVal > bVal) return getter[1] === "ASC" ? 1 : -1;
      if (aVal < bVal) return getter[1] === "ASC" ? -1 : 1;
    }

    return 0;
  };
}

export function sorter(getter: sorterGetterResolvable, direction: sorterDirection = "ASC"): sorterFn {
  return multiSorter([[getter, direction]]);
}

export function noop() {
  // IT'S LITERALLY NOTHING
}

export const DBDateFormat = "YYYY-MM-DD HH:mm:ss";

export type CustomEmoji = {
  id: string;
} & Emoji;

export interface INotifyUserConfig {
  useDM?: boolean;
  useChannel?: boolean;
  channelId?: string;
}

export enum NotifyUserStatus {
  Ignored = 1,
  Failed,
  DirectMessaged,
  ChannelMessaged,
}

export interface INotifyUserResult {
  status: NotifyUserStatus;
  text?: string;
}

export async function notifyUser(
  bot: Client,
  guild: Guild,
  user: User,
  body: string,
  config: INotifyUserConfig,
): Promise<INotifyUserResult> {
  if (!config.useDM && !config.useChannel) {
    return { status: NotifyUserStatus.Ignored };
  }

  if (config.useDM) {
    try {
      const dmChannel = await bot.getDMChannel(user.id);
      await dmChannel.createMessage(body);
      logger.info(`Notified ${user.id} via DM: ${body}`);
      return {
        status: NotifyUserStatus.DirectMessaged,
        text: "user notified with a direct message",
      };
    } catch (e) {} // tslint:disable-line
  }

  if (config.useChannel && config.channelId) {
    try {
      const channel = guild.channels.get(config.channelId);
      if (channel instanceof TextChannel) {
        await channel.createMessage(`<@!${user.id}> ${body}`);
        return {
          status: NotifyUserStatus.ChannelMessaged,
          text: `user notified in <#${channel.id}>`,
        };
      }
    } catch (e) {} // tslint:disable-line
  }

  return {
    status: NotifyUserStatus.Failed,
    text: "failed to message user",
  };
}

export function ucfirst(str) {
  if (typeof str !== "string" || str === "") return str;
  return str[0].toUpperCase() + str.slice(1);
}

export class UnknownUser {
  public id: string = null;
  public username = "Unknown";
  public discriminator = "0000";

  constructor(props = {}) {
    for (const key in props) {
      this[key] = props[key];
    }
  }
}

export function isObjectLiteral(obj) {
  let deepestPrototype = obj;
  while (Object.getPrototypeOf(deepestPrototype) != null) {
    deepestPrototype = Object.getPrototypeOf(deepestPrototype);
  }
  return Object.getPrototypeOf(obj) === deepestPrototype;
}

const keyMods = ["+", "-", "="];
export function deepKeyIntersect(obj, keyReference) {
  const result = {};
  for (let [key, value] of Object.entries(obj)) {
    if (!keyReference.hasOwnProperty(key)) {
      // Temporary solution so we don't erase keys with modifiers
      // Modifiers will be removed soon(tm) so we can remove this when that happens as well
      let found = false;
      for (const mod of keyMods) {
        if (keyReference.hasOwnProperty(mod + key)) {
          key = mod + key;
          found = true;
          break;
        }
      }
      if (!found) continue;
    }

    if (Array.isArray(value)) {
      // Also temp (because modifier shenanigans)
      result[key] = keyReference[key];
    } else if (
      value != null &&
      typeof value === "object" &&
      typeof keyReference[key] === "object" &&
      isObjectLiteral(value)
    ) {
      result[key] = deepKeyIntersect(value, keyReference[key]);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const unknownUsers = new Set();
const unknownMembers = new Set();

export function resolveUserId(bot: Client, value: string) {
  if (value == null) {
    return null;
  }

  // A user mention?
  const mentionMatch = value.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    return mentionMatch[1];
  }

  // A non-mention, full username?
  const usernameMatch = value.match(/^@?([^#]+)#(\d{4})$/);
  if (usernameMatch) {
    const user = bot.users.find(u => u.username === usernameMatch[1] && u.discriminator === usernameMatch[2]);
    if (user) return user.id;
  }

  // Just a user ID?
  const idMatch = value.match(/^\d+$/);
  if (idMatch) {
    return value;
  }

  return null;
}

export async function resolveUser(bot: Client, value: string): Promise<User | UnknownUser> {
  if (value == null || typeof value !== "string") {
    return new UnknownUser();
  }

  // If we have the user cached, return that directly
  const userId = resolveUserId(bot, value);
  if (!userId) {
    return new UnknownUser({ id: userId });
  }

  if (bot.users.has(userId)) {
    return bot.users.get(userId);
  }

  // We don't want to spam the API by trying to fetch unknown users again and again,
  // so we cache the fact that they're "unknown" for a while
  if (unknownUsers.has(userId)) {
    return new UnknownUser({ id: userId });
  }

  const freshUser = await bot.getRESTUser(userId).catch(noop);
  if (freshUser) {
    bot.users.add(freshUser, bot);
    return freshUser;
  }

  unknownUsers.add(userId);
  setTimeout(() => unknownUsers.delete(userId), 15 * MINUTES);

  return new UnknownUser({ id: userId });
}

export async function resolveMember(bot: Client, guild: Guild, value: string): Promise<Member> {
  const userId = resolveUserId(bot, value);
  if (!userId) return null;

  // If we have the member cached, return that directly
  if (guild.members.has(userId)) {
    return guild.members.get(userId);
  }

  // We don't want to spam the API by trying to fetch unknown members again and again,
  // so we cache the fact that they're "unknown" for a while
  const unknownKey = `${guild.id}-${userId}`;
  if (unknownMembers.has(unknownKey)) {
    return null;
  }

  logger.debug(`Fetching unknown member (${userId} in ${guild.name} (${guild.id})) from the API`);

  const freshMember = await bot.getRESTGuildMember(guild.id, userId).catch(noop);
  if (freshMember) {
    freshMember.id = userId;
    return freshMember;
  }

  unknownMembers.add(unknownKey);
  setTimeout(() => unknownMembers.delete(unknownKey), 15 * MINUTES);

  return null;
}

export async function resolveRoleId(bot: Client, guildId: string, value: string) {
  if (value == null) {
    return null;
  }

  // Role mention
  const mentionMatch = value.match(/^<@&?(\d+)>$/);
  if (mentionMatch) {
    return mentionMatch[1];
  }

  // Role name
  const roleList = await bot.getRESTGuildRoles(guildId);
  const role = roleList.filter(x => x.name.toLocaleLowerCase() === value.toLocaleLowerCase());
  if (role[0]) {
    return role[0].id;
  }

  // Role ID
  const idMatch = value.match(/^\d+$/);
  if (idMatch) {
    return value;
  }
  return null;
}

export type StrictMessageContent = { content?: string; tts?: boolean; disableEveryone?: boolean; embed?: EmbedOptions };

export async function confirm(bot: Client, channel: TextableChannel, userId: string, content: MessageContent) {
  const msg = await channel.createMessage(content);
  const reply = await waitForReaction(bot, msg, ["✅", "❌"], userId);
  msg.delete().catch(noop);
  return reply && reply.name === "✅";
}

export function messageSummary(msg: SavedMessage) {
  // Regular text content
  let result = "```" + (msg.data.content ? disableCodeBlocks(msg.data.content) : "<no text content>") + "```";

  // Rich embed
  const richEmbed = (msg.data.embeds || []).find(e => (e as Embed).type === "rich");
  if (richEmbed) result += "Embed:```" + disableCodeBlocks(JSON.stringify(richEmbed)) + "```";

  // Attachments
  if (msg.data.attachments) {
    result +=
      "Attachments:\n" + msg.data.attachments.map((a: Attachment) => disableLinkPreviews(a.url)).join("\n") + "\n";
  }

  return result;
}

export function verboseUserMention(user: User | UnknownUser): string {
  return `<@!${user.id}> (**${user.username}#${user.discriminator}**, \`${user.id}\`)`;
}

export function verboseUserName(user: User | UnknownUser): string {
  return `**${user.username}#${user.discriminator}** (\`${user.id}\`)`;
}

export function verboseChannelMention(channel: GuildChannel): string {
  return `<#${channel.id}> (**#${channel.name}**, \`${channel.id}\`)`;
}

export function messageLink(message: Message): string;
export function messageLink(guildId: string, channelId: string, messageId: string): string;
export function messageLink(guildIdOrMessage: string | Message | null, channelId?: string, messageId?: string): string {
  let guildId;
  if (guildIdOrMessage == null) {
    // Full arguments without a guild id -> DM/Group chat
    guildId = "@me";
  } else if (guildIdOrMessage instanceof Message) {
    // Message object as the only argument
    guildId = (guildIdOrMessage.channel as GuildChannel).guild?.id ?? "@me";
    channelId = guildIdOrMessage.channel.id;
    messageId = guildIdOrMessage.id;
  } else {
    // Full arguments with all IDs
    guildId = guildIdOrMessage;
  }

  return `https://discordapp.com/channels/${guildId}/${channelId}/${messageId}`;
}

export function isValidEmbed(embed: any): boolean {
  const result = decodeAndValidateStrict(tEmbed, embed);
  return !(result instanceof StrictValidationError);
}
