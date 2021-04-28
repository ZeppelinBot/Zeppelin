import {
  AllowedMentions,
  Attachment,
  Client,
  Constants,
  Embed,
  EmbedOptions,
  Emoji,
  Guild,
  GuildAuditLog,
  GuildAuditLogEntry,
  GuildChannel,
  Invite,
  InvitePartialChannel,
  Member,
  Message,
  MessageContent,
  PossiblyUncachedMessage,
  TextableChannel,
  TextChannel,
  User,
} from "eris";
import { URL } from "url";
import tlds from "tlds";
import emojiRegex from "emoji-regex";
import * as t from "io-ts";

import fs from "fs";
import https from "https";
import tmp from "tmp";
import { helpers } from "knub";
import { SavedMessage } from "./data/entities/SavedMessage";
import { decodeAndValidateStrict, StrictValidationError } from "./validatorUtils";
import { either } from "fp-ts/lib/Either";
import moment from "moment-timezone";
import { SimpleCache } from "./SimpleCache";
import { logger } from "./logger";
import { unsafeCoerce } from "fp-ts/lib/function";
import { sendDM } from "./utils/sendDM";
import { LogType } from "./data/LogType";

const fsp = fs.promises;

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

// https://discord.com/developers/docs/reference#snowflakes
export const MIN_SNOWFLAKE = 0b000000000000000000000000000000000000000000_00001_00001_000000000001;
// 0b111111111111111111111111111111111111111111_11111_11111_111111111111 without _ which BigInt doesn't support
export const MAX_SNOWFLAKE = BigInt("0b1111111111111111111111111111111111111111111111111111111111111111");

const snowflakePattern = /^[1-9]\d+$/;
export function isValidSnowflake(str: string) {
  if (!str.match(snowflakePattern)) return false;
  if (parseInt(str, 10) < MIN_SNOWFLAKE) return false;
  if (BigInt(str) > MAX_SNOWFLAKE) return false;
  return true;
}

export const DISCORD_HTTP_ERROR_NAME = "DiscordHTTPError";
export const DISCORD_REST_ERROR_NAME = "DiscordRESTError";

export function isDiscordHTTPError(err: Error | string) {
  return typeof err === "object" && err.constructor?.name === DISCORD_HTTP_ERROR_NAME;
}

export function isDiscordRESTError(err: Error | string) {
  return typeof err === "object" && err.constructor?.name === DISCORD_REST_ERROR_NAME;
}

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
  if (type instanceof t.InterfaceType || type instanceof t.PartialType) {
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

// https://stackoverflow.com/a/49262929/316944
export type Not<T, E> = T & Exclude<T, E>;

// io-ts partial dictionary type
// From https://github.com/gcanti/io-ts/issues/429#issuecomment-655394345
export interface PartialDictionaryC<D extends t.Mixed, C extends t.Mixed>
  extends t.DictionaryType<
    D,
    C,
    {
      [K in t.TypeOf<D>]?: t.TypeOf<C>;
    },
    {
      [K in t.OutputOf<D>]?: t.OutputOf<C>;
    },
    unknown
  > {}

export const tPartialDictionary = <D extends t.Mixed, C extends t.Mixed>(
  domain: D,
  codomain: C,
  name?: string,
): PartialDictionaryC<D, C> => {
  return unsafeCoerce(t.record(t.union([domain, t.undefined]), codomain, name));
};

export function nonNullish<V>(v: V): v is NonNullable<V> {
  return v != null;
}

export type InviteOpts = "withMetadata" | "withCount" | "withoutCount";
export type GuildInvite<CT extends InviteOpts = "withMetadata"> = Invite<CT> & { guild: Guild };
export type GroupDMInvite<CT extends InviteOpts = "withMetadata"> = Invite<CT> & {
  channel: InvitePartialChannel;
  type: typeof Constants.ChannelTypes.GROUP_DM;
};

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

export type EmbedWith<T extends keyof EmbedOptions> = EmbedOptions & Pick<Required<EmbedOptions>, T>;

export type StrictMessageContent = { content?: string; tts?: boolean; disableEveryone?: boolean; embed?: EmbedOptions };

export const tStrictMessageContent = t.type({
  content: tNullable(t.string),
  tts: tNullable(t.boolean),
  disableEveryone: tNullable(t.boolean),
  embed: tNullable(tEmbed),
});

export const tMessageContent = t.union([t.string, tStrictMessageContent]);

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
        s.length === 10 ? moment.utc(s, "YYYY-MM-DD") : s.length === 19 ? moment.utc(s, "YYYY-MM-DD HH:mm:ss") : null;

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

// To avoid running into issues with the JS max date vaLue, we cap maximum delay strings *far* below that.
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#The_ECMAScript_epoch_and_timestamps
const MAX_DELAY_STRING_AMOUNT = 100 * 365 * DAYS;

/**
 * Turns a "delay string" such as "1h30m" to milliseconds
 */
export function convertDelayStringToMS(str, defaultUnit = "m"): number | null {
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

  if (ms > MAX_DELAY_STRING_AMOUNT) {
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
    // hasOwnProperty check here is necessary to prevent prototype traversal in tags
    if (!cursor.hasOwnProperty(part)) return def;
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
const auditLogNextAttemptAfterFail: Map<string, number> = new Map();
const AUDIT_LOG_FAIL_COOLDOWN = 2 * MINUTES;

export async function findRelevantAuditLogEntry(
  guild: Guild,
  actionType: number,
  userId: string,
  attempts: number = 3,
  attemptDelay: number = 3000,
): Promise<GuildAuditLogEntry | null> {
  if (auditLogNextAttemptAfterFail.has(guild.id) && auditLogNextAttemptAfterFail.get(guild.id)! > Date.now()) {
    return null;
  }

  let auditLogs: GuildAuditLog | null = null;
  try {
    auditLogs = await guild.getAuditLogs(5, undefined, actionType);
  } catch (e) {
    if (isDiscordRESTError(e) && e.code === 50013) {
      // If we don't have permission to read audit log, set audit log requests on cooldown
      auditLogNextAttemptAfterFail.set(guild.id, Date.now() + AUDIT_LOG_FAIL_COOLDOWN);
    } else if (isDiscordHTTPError(e) && e.code === 500) {
      // Ignore internal server errors which seem to be pretty common with audit log requests
    } else if (e.message.startsWith("Request timed out")) {
      // Ignore timeouts, try again next loop
    } else {
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

const realLinkRegex = /https?:\/\/\S+/; // http://anything or https://anything
const plainLinkRegex = /((?!https?:\/\/)\S)+\.\S+/; // anything.anything, without http:// or https:// preceding it
// Both of the above, with precedence on the first one
const urlRegex = new RegExp(`(${realLinkRegex.source}|${plainLinkRegex.source})`, "g");
const protocolRegex = /^[a-z]+:\/\//;

interface MatchedURL extends URL {
  input: string;
}

export function getUrlsInString(str: string, onlyUnique = false): MatchedURL[] {
  let matches = str.match(urlRegex) || [];
  if (onlyUnique) {
    matches = unique(matches);
  }

  return matches.reduce<MatchedURL[]>((urls, match) => {
    const withProtocol = protocolRegex.test(match) ? match : `https://${match}`;

    let matchUrl: MatchedURL;
    try {
      matchUrl = new URL(withProtocol) as MatchedURL;
      matchUrl.input = match;
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

export function parseInviteCodeInput(str: string): string {
  if (str.match(/^[a-z0-9]{6,}$/i)) {
    return str;
  }

  return getInviteCodesInString(str)[0];
}

export function isNotNull(value): value is Exclude<typeof value, null> {
  return value != null;
}

// discord.com/invite/<code>
// discordapp.com/invite/<code>
// discord.gg/invite/<code>
// discord.gg/<code>
const quickInviteDetection = /(?:discord.com|discordapp.com)\/invite\/([^\s\/#?]+)|discord.gg\/(?:\S+\/)?([^\s\/#?]+)/gi;

const isInviteHostRegex = /(?:^|\.)(?:discord.gg|discord.com|discordapp.com)$/;
const longInvitePathRegex = /^\/invite\/([^\s\/]+)$/;

export function getInviteCodesInString(str: string): string[] {
  const inviteCodes: string[] = [];

  // Clean up markdown
  str = str.replace(/[|*_~]/g, "");

  // Quick detection
  const quickDetectionMatch = str.matchAll(quickInviteDetection);
  if (quickDetectionMatch) {
    inviteCodes.push(...[...quickDetectionMatch].map(m => m[1] || m[2]));
  }

  // Deep detection via URL parsing
  const linksInString = getUrlsInString(str, true);
  const potentialInviteLinks = linksInString.filter(url => isInviteHostRegex.test(url.hostname));
  const withNormalizedPaths = potentialInviteLinks.map(url => {
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/g, "");
    return url;
  });

  const codesFromInviteLinks = withNormalizedPaths
    .map(url => {
      // discord.gg/[anything/]<code>
      if (url.hostname === "discord.gg") {
        const parts = url.pathname.split("/").filter(Boolean);
        return parts[parts.length - 1];
      }

      // discord.com/invite/<code>[/anything]
      // discordapp.com/invite/<code>[/anything]
      const longInviteMatch = url.pathname.match(longInvitePathRegex);
      if (longInviteMatch) {
        return longInviteMatch[1];
      }

      return null;
    })
    .filter(Boolean) as string[];

  inviteCodes.push(...codesFromInviteLinks);

  return unique(inviteCodes);
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

export function trimEmptyLines(str: string) {
  return str
    .split("\n")
    .filter(l => l.trim() !== "")
    .join("\n");
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

  return lines.slice(emptyLinesAtStart, emptyLinesAtEnd ? -1 * emptyLinesAtEnd : undefined).join("\n");
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
export const preEmbedPadding = emptyEmbedValue + "\n";
export const embedPadding = "\n" + emptyEmbedValue;

export const userMentionRegex = /<@!?([0-9]+)>/g;
export const roleMentionRegex = /<@&([0-9]+)>/g;
export const channelMentionRegex = /<#([0-9]+)>/g;

export function getUserMentions(str: string) {
  const regex = new RegExp(userMentionRegex.source, "g");
  const userIds: string[] = [];
  let match;

  // tslint:disable-next-line
  while ((match = regex.exec(str)) !== null) {
    userIds.push(match[1]);
  }

  return userIds;
}

export function getRoleMentions(str: string) {
  const regex = new RegExp(roleMentionRegex.source, "g");
  const roleIds: string[] = [];
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
  return content.replace(/cdn\.discord(app)?\.com/g, "media.discordapp.net");
}

export function chunkArray<T>(arr: T[], chunkSize): T[][] {
  const chunks: T[][] = [];
  let currentChunk: T[] = [];

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

  const chunks: string[] = [];

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
 *
 * Default maxChunkLength is 1990, a bit under the message length limit of 2000, so we have space to add code block
 * shenanigans to the start/end when needed. Take this into account when choosing a custom maxChunkLength as well.
 */
export function chunkMessageLines(str: string, maxChunkLength = 1990): string[] {
  const chunks = chunkLines(str, maxChunkLength);
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

export async function createChunkedMessage(
  channel: TextableChannel,
  messageText: string,
  allowedMentions?: AllowedMentions,
) {
  const chunks = chunkMessageLines(messageText);
  for (const chunk of chunks) {
    await channel.createMessage({ content: chunk, allowedMentions });
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
export function simpleClosestStringMatch(searchStr: string, haystack: string[]): string | null;
export function simpleClosestStringMatch<T extends Not<any, string>>(
  searchStr,
  haystack: T[],
  getter: (item: T) => string,
): T | null;
export function simpleClosestStringMatch(searchStr, haystack, getter?) {
  const normalizedSearchStr = searchStr.toLowerCase();

  // See if any haystack item contains a part of the search string
  const itemsWithRankings: Array<ItemWithRanking<any>> = haystack.map(item => {
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

    return [item, i] as ItemWithRanking<any>;
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

export type CustomEmoji = {
  id: string;
} & Emoji;

export type UserNotificationMethod = { type: "dm" } | { type: "channel"; channel: TextChannel };

export const disableUserNotificationStrings = ["no", "none", "off"];

export interface UserNotificationResult {
  method: UserNotificationMethod | null;
  success: boolean;
  text?: string;
}

export function createUserNotificationError(text: string): UserNotificationResult {
  return {
    method: null,
    success: false,
    text,
  };
}

/**
 * Attempts to notify the user using one of the specified methods. Only the first one that succeeds will be used.
 * @param methods List of methods to try, in priority order
 */
export async function notifyUser(
  user: User,
  body: string,
  methods: UserNotificationMethod[],
): Promise<UserNotificationResult> {
  if (methods.length === 0) {
    return { method: null, success: true };
  }

  let lastError: Error | null = null;

  for (const method of methods) {
    if (method.type === "dm") {
      try {
        await sendDM(user, body, "mod action notification");
        return {
          method,
          success: true,
          text: "user notified with a direct message",
        };
      } catch (e) {
        lastError = e;
      }
    } else if (method.type === "channel") {
      try {
        await method.channel.createMessage(`<@!${user.id}> ${body}`);
        return {
          method,
          success: true,
          text: `user notified in <#${method.channel.id}>`,
        };
      } catch (e) {
        lastError = e;
      }
    }
  }

  const errorText = lastError ? `failed to message user: ${lastError.message}` : `failed to message user`;

  return {
    method: null,
    success: false,
    text: errorText,
  };
}

export function ucfirst(str) {
  if (typeof str !== "string" || str === "") return str;
  return str[0].toUpperCase() + str.slice(1);
}

export class UnknownUser {
  public id: string;
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
  if (isValidSnowflake(value)) {
    return value;
  }

  return null;
}

/**
 * Finds a matching User for the passed user id, user mention, or full username (with discriminator).
 * If a user is not found, returns an UnknownUser instead.
 */
export function getUser(client: Client, userResolvable: string): User | UnknownUser {
  const id = resolveUserId(client, userResolvable);
  return id ? client.users.get(id) || new UnknownUser({ id }) : new UnknownUser();
}

/**
 * Resolves a User from the passed string. The passed string can be a user id, a user mention, a full username (with discrim), etc.
 * If the user is not found in the cache, it's fetched from the API.
 */
export async function resolveUser(bot: Client, value: string): Promise<User | UnknownUser>;
export async function resolveUser<T>(bot: Client, value: Not<T, string>): Promise<UnknownUser>;
export async function resolveUser<T>(bot, value) {
  if (typeof value !== "string") {
    return new UnknownUser();
  }

  const userId = resolveUserId(bot, value);
  if (!userId) {
    return new UnknownUser();
  }

  // If we have the user cached, return that directly
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

/**
 * Resolves a guild Member from the passed user id, user mention, or full username (with discriminator).
 * If the member is not found in the cache, it's fetched from the API.
 */
export async function resolveMember(bot: Client, guild: Guild, value: string, fresh = false): Promise<Member | null> {
  const userId = resolveUserId(bot, value);
  if (!userId) return null;

  // If we have the member cached, return that directly
  if (guild.members.has(userId) && !fresh) {
    return guild.members.get(userId) || null;
  }

  // We don't want to spam the API by trying to fetch unknown members again and again,
  // so we cache the fact that they're "unknown" for a while
  const unknownKey = `${guild.id}-${userId}`;
  if (unknownMembers.has(unknownKey)) {
    return null;
  }

  const freshMember = await bot.getRESTGuildMember(guild.id, userId).catch(noop);
  if (freshMember) {
    freshMember.id = userId;
    return freshMember;
  }

  unknownMembers.add(unknownKey);
  setTimeout(() => unknownMembers.delete(unknownKey), 15 * MINUTES);

  return null;
}

/**
 * Resolves a role from the passed role ID, role mention, or role name.
 * In the event of duplicate role names, this function will return the first one it comes across.
 *
 * FIXME: Define "first one it comes across" better
 */
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

const inviteCache = new SimpleCache<Promise<Invite<any> | null>>(10 * MINUTES, 200);

type ResolveInviteReturnType<T extends boolean> = Promise<
  (T extends true ? Invite<"withCount" | "withMetadata"> : Invite<"withMetadata">) | null
>;
export async function resolveInvite<T extends boolean>(
  client: Client,
  code: string,
  withCounts?: T,
): ResolveInviteReturnType<T> {
  const key = `${code}:${withCounts ? 1 : 0}`;

  if (inviteCache.has(key)) {
    return inviteCache.get(key) as ResolveInviteReturnType<T>;
  }

  // @ts-ignore: the getInvite() withCounts typings are blergh
  const promise = client.getInvite(code, withCounts).catch(() => null);
  inviteCache.set(key, promise);

  return promise as ResolveInviteReturnType<T>;
}

export async function confirm(bot: Client, channel: TextableChannel, userId: string, content: MessageContent) {
  const msg = await channel.createMessage(content);
  const reply = await helpers.waitForReaction(bot, msg, ["✅", "❌"], userId);
  msg.delete().catch(noop);
  return reply && reply.name === "✅";
}

export function messageSummary(msg: SavedMessage) {
  // Regular text content
  let result = "```\n" + (msg.data.content ? disableCodeBlocks(msg.data.content) : "<no text content>") + "```";

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
  if (user.id == null) {
    return `**${user.username}#${user.discriminator}**`;
  }

  return `<@!${user.id}> (**${user.username}#${user.discriminator}**, \`${user.id}\`)`;
}

export function verboseUserName(user: User | UnknownUser): string {
  if (user.id == null) {
    return `**${user.username}#${user.discriminator}**`;
  }

  return `**${user.username}#${user.discriminator}** (\`${user.id}\`)`;
}

export function verboseChannelMention(channel: GuildChannel): string {
  const plainTextName =
    channel.type === Constants.ChannelTypes.GUILD_VOICE || channel.type === Constants.ChannelTypes.GUILD_STAGE
      ? channel.name
      : `#${channel.name}`;
  return `<#${channel.id}> (**${plainTextName}**, \`${channel.id}\`)`;
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

  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

export function isValidEmbed(embed: any): boolean {
  const result = decodeAndValidateStrict(tEmbed, embed);
  return !(result instanceof StrictValidationError);
}

const formatter = new Intl.NumberFormat("en-US");
export function formatNumber(numberToFormat: number): string {
  return formatter.format(numberToFormat);
}

interface IMemoizedItem {
  createdAt: number;
  value: any;
}

const memoizeCache: Map<any, IMemoizedItem> = new Map();
export function memoize<T>(fn: (...args: any[]) => T, key?, time?): T {
  const realKey = key ?? fn;

  if (memoizeCache.has(realKey)) {
    const memoizedItem = memoizeCache.get(realKey)!;
    if (!time || memoizedItem.createdAt > Date.now() - time) {
      return memoizedItem.value;
    }

    memoizeCache.delete(realKey);
  }

  const value = fn();
  memoizeCache.set(realKey, {
    createdAt: Date.now(),
    value,
  });

  return value;
}

type RecursiveRenderFn = (str: string) => string | Promise<string>;

export async function renderRecursively(value, fn: RecursiveRenderFn) {
  if (Array.isArray(value)) {
    const result: any[] = [];
    for (const item of value) {
      result.push(await renderRecursively(item, fn));
    }
    return result;
  } else if (value === null) {
    return null;
  } else if (typeof value === "object") {
    const result = {};
    for (const [prop, _value] of Object.entries(value)) {
      result[prop] = await renderRecursively(_value, fn);
    }
    return result;
  } else if (typeof value === "string") {
    return fn(value);
  }

  return value;
}

export function isValidEmoji(emoji: string): boolean {
  return isUnicodeEmoji(emoji) || isSnowflake(emoji);
}

export function canUseEmoji(client: Client, emoji: string): boolean {
  if (isUnicodeEmoji(emoji)) {
    return true;
  } else if (isSnowflake(emoji)) {
    for (const guild of client.guilds.values()) {
      if (guild.emojis.some(e => (e as any).id === emoji)) {
        return true;
      }
    }
  } else {
    throw new Error(`Invalid emoji ${emoji}`);
  }

  return false;
}

export function trimPluginDescription(str) {
  const emptyLinesTrimmed = trimEmptyStartEndLines(str);
  const lines = emptyLinesTrimmed.split("\n");
  const firstLineIndentation = (lines[0].match(/^ +/g) || [""])[0].length;
  return trimIndents(emptyLinesTrimmed, firstLineIndentation);
}

export function isFullMessage(msg: PossiblyUncachedMessage): msg is Message {
  return (msg as Message).createdAt != null;
}

export function isGuildInvite<CT extends InviteOpts>(invite: Invite<CT>): invite is GuildInvite<CT> {
  return invite.guild != null;
}

export function isGroupDMInvite<CT extends InviteOpts>(invite: Invite<CT>): invite is GroupDMInvite<CT> {
  return invite.guild == null && invite.channel?.type === Constants.ChannelTypes.GROUP_DM;
}

export function inviteHasCounts(invite: Invite<any>): invite is Invite<"withCount"> {
  return invite.memberCount != null;
}

export function asyncMap<T, R>(arr: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  return Promise.all(arr.map((item, index) => fn(item)));
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export const DBDateFormat = "YYYY-MM-DD HH:mm:ss";
