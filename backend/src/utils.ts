import {
  APIEmbed,
  ChannelType,
  Client,
  DiscordAPIError,
  EmbedData,
  EmbedType,
  Emoji,
  escapeCodeBlock,
  Guild,
  GuildBasedChannel,
  GuildChannel,
  GuildMember,
  GuildTextBasedChannel,
  Invite,
  InviteGuild,
  LimitedCollection,
  Message,
  MessageCreateOptions,
  MessageMentionOptions,
  PartialChannelData,
  PartialMessage,
  RoleResolvable,
  Sticker,
  TextBasedChannel,
  User,
} from "discord.js";
import emojiRegex from "emoji-regex";
import fs from "fs";
import https from "https";
import humanizeDuration from "humanize-duration";
import isEqual from "lodash/isEqual.js";
import { performance } from "perf_hooks";
import tlds from "tlds" assert { type: "json" };
import tmp from "tmp";
import { URL } from "url";
import { z, ZodEffects, ZodError, ZodRecord, ZodString } from "zod";
import { ISavedMessageAttachmentData, SavedMessage } from "./data/entities/SavedMessage.js";
import { getProfiler } from "./profiler.js";
import { SimpleCache } from "./SimpleCache.js";
import { sendDM } from "./utils/sendDM.js";
import { Brand } from "./utils/typeUtils.js";
import { waitForButtonConfirm } from "./utils/waitForInteraction.js";

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
export const DISCORD_REST_ERROR_NAME = "DiscordAPIError";

export function isDiscordHTTPError(err: Error | string) {
  return typeof err === "object" && err.constructor?.name === DISCORD_HTTP_ERROR_NAME;
}

export function isDiscordAPIError(err: Error | string): err is DiscordAPIError {
  return err instanceof DiscordAPIError;
}

// null | undefined -> undefined
export function zNullishToUndefined<T extends z.ZodTypeAny>(
  type: T,
): ZodEffects<T, NonNullable<z.output<T>> | undefined> {
  return type.transform((v) => v ?? undefined);
}

export function getScalarDifference<T extends object>(
  base: T,
  object: T,
  ignoreKeys: string[] = [],
): Map<string, { was: any; is: any }> {
  base = stripObjectToScalars(base) as T;
  object = stripObjectToScalars(object) as T;
  const diff = new Map<string, { was: any; is: any }>();

  for (const [key, value] of Object.entries(object)) {
    if (!isEqual(value, base[key]) && !ignoreKeys.includes(key)) {
      diff.set(key, { was: base[key], is: value });
    }
  }

  return diff;
}

// This is a stupid, messy solution that is not extendable at all.
// If anyone plans on adding anything to this, they should rewrite this first.
// I just want to get this done and this works for now :)
export function prettyDifference(diff: Map<string, { was: any; is: any }>): Map<string, { was: any; is: any }> {
  const toReturn = new Map<string, { was: any; is: any }>();

  for (let [key, difference] of diff) {
    if (key === "rateLimitPerUser") {
      difference.is = humanizeDuration(difference.is * 1000);
      difference.was = humanizeDuration(difference.was * 1000);
      key = "slowmode";
    }

    toReturn.set(key, { was: difference.was, is: difference.is });
  }

  return toReturn;
}

export function differenceToString(diff: Map<string, { was: any; is: any }>): string {
  let toReturn = "";
  diff = prettyDifference(diff);
  for (const [key, difference] of diff) {
    toReturn += `**${key[0].toUpperCase() + key.slice(1)}**: \`${difference.was}\` ➜ \`${difference.is}\`\n`;
  }
  return toReturn;
}

// https://stackoverflow.com/a/49262929/316944
export type Not<T, E> = T & Exclude<T, E>;

export function nonNullish<V>(v: V): v is NonNullable<V> {
  return v != null;
}

export type GuildInvite = Invite & { guild: InviteGuild | Guild };
export type GroupDMInvite = Invite & {
  channel: PartialChannelData;
  type: typeof ChannelType.GroupDM;
};

export function zBoundedCharacters(min: number, max: number) {
  return z.string().refine(
    (str) => {
      const len = [...str].length; // Unicode aware character split
      return len >= min && len <= max;
    },
    {
      message: `String must be between ${min} and ${max} characters long`,
    },
  );
}

export const zSnowflake = z.string().refine((str) => isSnowflake(str), {
  message: "Invalid snowflake ID",
});

const regexWithFlags = /^\/(.*?)\/([i]*)$/;

export class InvalidRegexError extends Error {}

/**
 * This function supports two input syntaxes for regexes: /<pattern>/<flags> and just <pattern>
 */
export function inputPatternToRegExp(pattern: string) {
  const advancedSyntaxMatch = pattern.match(regexWithFlags);
  const [finalPattern, flags] = advancedSyntaxMatch ? [advancedSyntaxMatch[1], advancedSyntaxMatch[2]] : [pattern, ""];
  try {
    return new RegExp(finalPattern, flags);
  } catch (e) {
    throw new InvalidRegexError(e.message);
  }
}

export function zRegex<T extends ZodString>(zStr: T) {
  return zStr.transform((str, ctx) => {
    try {
      return inputPatternToRegExp(str);
    } catch (err) {
      if (err instanceof InvalidRegexError) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid regex",
        });
        return z.NEVER;
      }
      throw err;
    }
  });
}

export const zEmbedInput = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  url: z.string().optional(),
  timestamp: z.string().optional(),
  color: z.number().optional(),

  footer: z.optional(
    z.object({
      text: z.string(),
      icon_url: z.string().optional(),
    }),
  ),

  image: z.optional(
    z.object({
      url: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  ),

  thumbnail: z.optional(
    z.object({
      url: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  ),

  video: z.optional(
    z.object({
      url: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  ),

  provider: z.optional(
    z.object({
      name: z.string(),
      url: z.string().optional(),
    }),
  ),

  fields: z.optional(
    z.array(
      z.object({
        name: z.string().optional(),
        value: z.string().optional(),
        inline: z.boolean().optional(),
      }),
    ),
  ),

  author: z
    .optional(
      z.object({
        name: z.string(),
        url: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    )
    .nullable(),
});

export type EmbedWith<T extends keyof APIEmbed> = APIEmbed & Pick<Required<APIEmbed>, T>;

export const zStrictMessageContent = z.object({
  content: z.string().optional(),
  tts: z.boolean().optional(),
  embeds: z.array(zEmbedInput).optional(),
});

export type ZStrictMessageContent = z.infer<typeof zStrictMessageContent>;

export type StrictMessageContent = {
  content?: string;
  tts?: boolean;
  embeds?: APIEmbed[];
};

export type MessageContent = string | StrictMessageContent;
export const zMessageContent = z.union([
  zBoundedCharacters(0, 4000),
  zStrictMessageContent,
]) as z.ZodType<MessageContent>;

export function validateAndParseMessageContent(input: unknown): StrictMessageContent {
  if (input == null) {
    return {};
  }

  if (typeof input !== "object") {
    return { content: String(input) };
  }

  // Migrate embed -> embeds
  if ((input as any).embed) {
    (input as any).embeds = [(input as any).embed];
    delete (input as any).embed;
  }

  dropNullValuesRecursively(input);

  try {
    return zStrictMessageContent.parse(input) as unknown as StrictMessageContent;
  } catch (err) {
    if (err instanceof ZodError) {
      // TODO: Allow error to be thrown and handle at use location
      return {};
    }

    throw err;
  }
}

function dropNullValuesRecursively(obj: any) {
  if (obj == null) {
    return;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      dropNullValuesRecursively(item);
    }
  }

  if (typeof obj !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (value == null) {
      delete obj[key];
      continue;
    }

    dropNullValuesRecursively(value);
  }
}

/**
 * Mirrors AllowedMentions from Eris
 */
export const zAllowedMentions = z.strictObject({
  everyone: zNullishToUndefined(z.boolean().nullable().optional()),
  users: zNullishToUndefined(
    z
      .union([z.boolean(), z.array(z.string())])
      .nullable()
      .optional(),
  ),
  roles: zNullishToUndefined(
    z
      .union([z.boolean(), z.array(z.string())])
      .nullable()
      .optional(),
  ),
  replied_user: zNullishToUndefined(z.boolean().nullable().optional()),
});

export function dropPropertiesByName(obj, propName) {
  if (Object.hasOwn(obj, propName)) {
    delete obj[propName];
  }
  for (const value of Object.values(obj)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      dropPropertiesByName(value, propName);
    }
  }
}

export function zBoundedRecord<TRecord extends ZodRecord<any, any>>(
  record: TRecord,
  minKeys: number,
  maxKeys: number,
): ZodEffects<TRecord> {
  return record.refine(
    (data) => {
      const len = Object.keys(data).length;
      return len >= minKeys && len <= maxKeys;
    },
    {
      message: `Object must have ${minKeys}-${maxKeys} keys`,
    },
  );
}

export const zDelayString = z
  .string()
  .max(32)
  .refine((str) => convertDelayStringToMS(str) !== null, {
    message: "Invalid delay string",
  });

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

export function successMessage(str: string, emoji = "<:zep_check:906897402101891093>") {
  return emoji ? `${emoji} ${str}` : str;
}

export function errorMessage(str, emoji = "⚠") {
  return emoji ? `${emoji} ${str}` : str;
}

export function get(obj, path, def?): any {
  let cursor = obj;
  const pathParts = path
    .split(".")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  for (const part of pathParts) {
    // hasOwn check here is necessary to prevent prototype traversal in tags
    if (!Object.hasOwn(cursor, part)) return def;
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
        .filter((p) => p === key || p.startsWith(prefix))
        .map((p) => (p === key ? p : p.slice(prefix.length)));

      if (nestedNested.length) {
        result[key] = stripObjectToScalars(obj[key], nestedNested);
      }
    }
  }

  return result;
}

export const snowflakeRegex = /[1-9][0-9]{5,19}/;

export type Snowflake = Brand<string, "Snowflake">;

const isSnowflakeRegex = new RegExp(`^${snowflakeRegex.source}$`);
export function isSnowflake(v: unknown): v is Snowflake {
  return typeof v === "string" && isSnowflakeRegex.test(v);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
  let matches = [...(str.match(urlRegex) ?? [])];
  if (onlyUnique) {
    matches = unique(matches);
  }

  return matches.reduce<MatchedURL[]>((urls, match) => {
    const withProtocol = protocolRegex.test(match) ? match : `https://${match}`;

    let matchUrl: MatchedURL;
    try {
      matchUrl = new URL(withProtocol) as MatchedURL;
      matchUrl.input = match;
    } catch {
      return urls;
    }

    let hostname = matchUrl.hostname.toLowerCase();

    if (hostname.length > 3) {
      hostname = hostname.replace(/[^a-z]+$/, "");
    }

    const hostnameParts = hostname.split(".");
    const tld = hostnameParts[hostnameParts.length - 1];
    if (tlds.includes(tld)) {
      urls.push(matchUrl);
    }

    return urls;
  }, []);
}

export function parseInviteCodeInput(str: string): string {
  const parsedInviteCodes = getInviteCodesInString(str);
  if (parsedInviteCodes.length) {
    return parsedInviteCodes[0];
  }

  return str;
}

export function isNotNull<T>(value: T): value is Exclude<T, null | undefined> {
  return value != null;
}

// discord.com/invite/<code>
// discordapp.com/invite/<code>
// discord.gg/invite/<code>
// discord.gg/<code>
// discord.com/friend-invite/<code>
const quickInviteDetection =
  /discord(?:app)?\.com\/(?:friend-)?invite\/([a-z0-9-]+)|discord\.gg\/(?:\S+\/)?([a-z0-9-]+)/gi;

const isInviteHostRegex = /(?:^|\.)(?:discord.gg|discord.com|discordapp.com)$/i;
const longInvitePathRegex = /^\/(?:friend-)?invite\/([a-z0-9-]+)$/i;

export function getInviteCodesInString(str: string): string[] {
  const inviteCodes: string[] = [];

  // Clean up markdown
  str = str.replace(/[|*_~]/g, "");

  // Quick detection
  const quickDetectionMatch = str.matchAll(quickInviteDetection);
  if (quickDetectionMatch) {
    inviteCodes.push(...[...quickDetectionMatch].map((m) => m[1] || m[2]));
  }

  // Deep detection via URL parsing
  const linksInString = getUrlsInString(str, true);
  const potentialInviteLinks = linksInString.filter((url) => isInviteHostRegex.test(url.hostname));
  const withNormalizedPaths = potentialInviteLinks.map((url) => {
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/g, "");
    return url;
  });

  const codesFromInviteLinks = withNormalizedPaths
    .map((url) => {
      // discord.gg/[anything/]<code>
      if (url.hostname === "discord.gg") {
        const parts = url.pathname.split("/").filter(Boolean);
        return parts[parts.length - 1];
      }

      // discord.com/invite/<code>[/anything]
      // discordapp.com/invite/<code>[/anything]
      // discord.com/friend-invite/<code>[/anything]
      // discordapp.com/friend-invite/<code>[/anything]
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
    .map((l) => l.trim())
    .join("\n")
    .trim();
}

export function trimEmptyLines(str: string) {
  return str
    .split("\n")
    .filter((l) => l.trim() !== "")
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
  const regex = new RegExp(`^\\s{0,${indentLength}}`, "g");
  return str
    .split("\n")
    .map((line) => line.replace(regex, ""))
    .join("\n");
}

export function indentLine(str: string, indentLength: number) {
  return " ".repeat(indentLength) + str;
}

export function indentLines(str: string, indentLength: number) {
  return str
    .split("\n")
    .map((line) => indentLine(line, indentLength))
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

export function useMediaUrls(content: string): string {
  return content.replace(/cdn\.discord(app)?\.com/g, "media.discordapp.net");
}

export function chunkArray<T>(arr: T[], chunkSize): T[][] {
  const chunks: T[][] = [];
  let currentChunk: T[] = [];

  for (let i = 0; i < arr.length; i++) {
    currentChunk.push(arr[i]);
    if ((i !== 0 && (i + 1) % chunkSize === 0) || i === arr.length - 1) {
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

  return chunks.map((chunk) => {
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
  channel: TextBasedChannel | User,
  messageText: string,
  allowedMentions?: MessageMentionOptions,
) {
  const chunks = chunkMessageLines(messageText);
  for (const chunk of chunks) {
    await channel.send({ content: chunk, allowedMentions });
  }
}

/**
 * Downloads the file from the given URL to a temporary file, with retry support
 */
export function downloadFile(attachmentUrl: string, retries = 3): Promise<{ path: string; deleteFn: () => void }> {
  return new Promise((resolve) => {
    tmp.file((err, path, fd, deleteFn) => {
      if (err) throw err;

      const writeStream = fs.createWriteStream(path);

      https
        .get(attachmentUrl, (res) => {
          res.pipe(writeStream);
          writeStream.on("finish", () => {
            writeStream.end();
            resolve({
              path,
              deleteFn,
            });
          });
        })
        .on("error", (httpsErr) => {
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
  const itemsWithRankings: Array<ItemWithRanking<any>> = haystack.map((item) => {
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
    return (obj) => obj[getter];
  }

  return getter;
}

export function multiSorter(getters: Array<sorterGetterResolvable | sorterGetterResolvableWithDirection>): sorterFn {
  const resolvedGetters: sorterGetterFnWithDirection[] = getters.map((getter) => {
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

export type UserNotificationMethod = { type: "dm" } | { type: "channel"; channel: GuildTextBasedChannel };

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
        await method.channel.send({
          content: `<@!${user.id}> ${body}`,
          allowedMentions: { users: [user.id] },
        });
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
  public tag = "Unknown#0000";

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
    if (!Object.hasOwn(keyReference, key)) {
      // Temporary solution so we don't erase keys with modifiers
      // Modifiers will be removed soon(tm) so we can remove this when that happens as well
      let found = false;
      for (const mod of keyMods) {
        if (Object.hasOwn(keyReference, mod + key)) {
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

  // Just a user ID?
  if (isValidSnowflake(value)) {
    return value;
  }

  // A user mention?
  const mentionMatch = value.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    return mentionMatch[1];
  }

  // a username
  const usernameMatch = value.match(/^@?(\S{3,})$/);
  if (usernameMatch) {
    const profiler = getProfiler();
    const start = performance.now();
    const user = bot.users.cache.find((u) => u.tag === usernameMatch[1]);
    profiler?.addDataPoint("utils:resolveUserId:usernameMatch", performance.now() - start);
    if (user) {
      return user.id;
    }
  }

  return null;
}

/**
 * Finds a matching User for the passed user id, user mention, or full username (with discriminator).
 * If a user is not found, returns an UnknownUser instead.
 */
export function getUser(client: Client, userResolvable: string): User | UnknownUser {
  const id = resolveUserId(client, userResolvable);
  return id ? client.users.resolve(id as Snowflake) || new UnknownUser({ id }) : new UnknownUser();
}

/**
 * Resolves a User from the passed string. The passed string can be a user id, a user mention, a full username (with discrim), etc.
 * If the user is not found in the cache, it's fetched from the API.
 */
export async function resolveUser(bot: Client, value: string): Promise<User | UnknownUser>;
export async function resolveUser<T>(bot: Client, value: Not<T, string>): Promise<UnknownUser>;
export async function resolveUser(bot, value) {
  if (typeof value !== "string") {
    return new UnknownUser();
  }

  const userId = resolveUserId(bot, value);
  if (!userId) {
    return new UnknownUser();
  }

  // If we have the user cached, return that directly
  if (bot.users.cache.has(userId)) {
    return bot.users.fetch(userId);
  }

  // We don't want to spam the API by trying to fetch unknown users again and again,
  // so we cache the fact that they're "unknown" for a while
  if (unknownUsers.has(userId)) {
    return new UnknownUser({ id: userId });
  }

  const freshUser = await bot.users.fetch(userId, true, true).catch(noop);
  if (freshUser) {
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
export async function resolveMember(
  bot: Client,
  guild: Guild,
  value: string,
  fresh = false,
): Promise<GuildMember | null> {
  const userId = resolveUserId(bot, value);
  if (!userId) return null;

  // If we have the member cached, return that directly
  if (guild.members.cache.has(userId as Snowflake) && !fresh) {
    return guild.members.cache.get(userId as Snowflake) || null;
  }

  // We don't want to spam the API by trying to fetch unknown members again and again,
  // so we cache the fact that they're "unknown" for a while
  const unknownKey = `${guild.id}-${userId}`;
  if (unknownMembers.has(unknownKey)) {
    return null;
  }

  const freshMember = await guild.members.fetch({ user: userId as Snowflake, force: true }).catch(noop);
  if (freshMember) {
    // freshMember.id = userId; // I dont even know why this is here -Dark
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
  const roleList = (await bot.guilds.fetch(guildId as Snowflake)).roles.cache;
  const role = roleList.filter((x) => x.name.toLocaleLowerCase() === value.toLocaleLowerCase());
  if (role.size >= 1) {
    return role.firstKey();
  }

  // Role ID
  const idMatch = value.match(/^\d+$/);
  if (idMatch) {
    return value;
  }
  return null;
}

export class UnknownRole {
  public id: string;
  public name: string;

  constructor(props = {}) {
    for (const key in props) {
      this[key] = props[key];
    }
  }
}

export function resolveRole(guild: Guild, roleResolvable: RoleResolvable) {
  const roleId = guild.roles.resolveId(roleResolvable);
  return guild.roles.resolve(roleId) ?? new UnknownRole({ id: roleId, name: roleId });
}

const inviteCache = new SimpleCache<Promise<Invite | null>>(10 * MINUTES, 200);

type ResolveInviteReturnType = Promise<Invite | null>;
export async function resolveInvite<T extends boolean>(
  client: Client,
  code: string,
  withCounts?: T,
): ResolveInviteReturnType {
  const key = `${code}:${withCounts ? 1 : 0}`;

  if (inviteCache.has(key)) {
    return inviteCache.get(key) as ResolveInviteReturnType;
  }

  const promise = client.fetchInvite(code).catch(() => null);
  inviteCache.set(key, promise);

  return promise as ResolveInviteReturnType;
}

const internalStickerCache: LimitedCollection<Snowflake, Sticker> = new LimitedCollection({ maxSize: 500 });

export async function resolveStickerId(bot: Client, id: Snowflake): Promise<Sticker | null> {
  const cachedSticker = internalStickerCache.get(id);
  if (cachedSticker) return cachedSticker;

  const fetchedSticker = await bot.fetchSticker(id).catch(() => null);
  if (fetchedSticker) {
    internalStickerCache.set(id, fetchedSticker);
  }

  return fetchedSticker;
}

export async function confirm(
  channel: GuildTextBasedChannel,
  userId: string,
  content: MessageCreateOptions,
): Promise<boolean> {
  return waitForButtonConfirm(channel, content, { restrictToId: userId });
}

export function messageSummary(msg: SavedMessage) {
  // Regular text content
  let result = "```\n" + (msg.data.content ? escapeCodeBlock(msg.data.content) : "<no text content>") + "```";

  // Rich embed
  const richEmbed = (msg.data.embeds || []).find((e) => (e as EmbedData).type === EmbedType.Rich);
  if (richEmbed) result += "Embed:```" + escapeCodeBlock(JSON.stringify(richEmbed)) + "```";

  // Attachments
  if (msg.data.attachments && msg.data.attachments.length) {
    result +=
      "Attachments:\n" +
      msg.data.attachments.map((a: ISavedMessageAttachmentData) => disableLinkPreviews(a.url)).join("\n") +
      "\n";
  }

  return result;
}

export function verboseUserMention(user: User | UnknownUser): string {
  if (user.id == null) {
    return `**${renderUsername(user.username, user.discriminator)}**`;
  }

  return `<@!${user.id}> (**${renderUsername(user.username, user.discriminator)}**, \`${user.id}\`)`;
}

export function verboseUserName(user: User | UnknownUser): string {
  if (user.id == null) {
    return `**${renderUsername(user.username, user.discriminator)}**`;
  }

  return `**${renderUsername(user.username, user.discriminator)}** (\`${user.id}\`)`;
}

export function verboseChannelMention(channel: GuildBasedChannel): string {
  const plainTextName =
    channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice
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
  return zEmbedInput.safeParse(embed).success;
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
export function memoize<T>(fn: () => T, key?, time?): T {
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

export function lazyMemoize<T extends () => unknown>(fn: T, key?: string, time?: number): T {
  return (() => {
    return memoize(fn, key, time);
  }) as T;
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
    for (const guild of client.guilds.cache) {
      if (guild[1].emojis.cache.some((e) => (e as any).id === emoji)) {
        return true;
      }
    }
  } else {
    throw new Error(`Invalid emoji ${emoji}`);
  }

  return false;
}

/**
 * Trims any empty lines from the beginning and end of the given string
 * and indents matching the first line's indent
 */
export function trimMultilineString(str) {
  const emptyLinesTrimmed = trimEmptyStartEndLines(str);
  const lines = emptyLinesTrimmed.split("\n");
  const firstLineIndentation = (lines[0].match(/^ +/g) || [""])[0].length;
  return trimIndents(emptyLinesTrimmed, firstLineIndentation);
}
export const trimPluginDescription = trimMultilineString;

export function isFullMessage(msg: Message | PartialMessage): msg is Message {
  return (msg as Message).createdAt != null;
}

export function isGuildInvite(invite: Invite): invite is GuildInvite {
  return invite.guild != null;
}

export function isGroupDMInvite(invite: Invite): invite is GroupDMInvite {
  return invite.guild == null && invite.channel?.type === ChannelType.GroupDM;
}

export function inviteHasCounts(invite: Invite): invite is Invite {
  return invite.memberCount != null;
}

export function asyncMap<T, R>(arr: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  return Promise.all(arr.map((item) => fn(item)));
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// From https://github.com/microsoft/TypeScript/pull/29955#issuecomment-470062531
export function isTruthy<T>(value: T): value is Exclude<T, false | null | undefined | "" | 0> {
  return Boolean(value);
}

export const DBDateFormat = "YYYY-MM-DD HH:mm:ss";

export function renderUsername(memberOrUser: GuildMember | UnknownUser | User): string;
export function renderUsername(username: string, discriminator: string): string;
export function renderUsername(username: string | User | GuildMember | UnknownUser, discriminator?: string): string {
  if (username instanceof GuildMember) return username.user.tag;
  if (username instanceof User || username instanceof UnknownUser) return username.tag;
  if (discriminator === "0") {
    return username;
  }
  return `${username}#${discriminator}`;
}

export function renderUserUsername(user: User | UnknownUser): string {
  return renderUsername(user.username, user.discriminator);
}

type Entries<T> = Array<
  {
    [Key in keyof T]-?: [Key, T[Key]];
  }[keyof T]
>;

export function entries<T extends object>(object: T) {
  return Object.entries(object) as Entries<T>;
}

export function keys<T extends object>(object: T) {
  return Object.keys(object) as Array<keyof T>;
}

export function values<T extends object>(object: T) {
  return Object.values(object) as Array<T[keyof T]>;
}
