import at = require("lodash.at");
import { GuildAuditLogEntry } from "eris";

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
  return str.replace(stringFormatRegex, (match, val) => {
    return (at(values, val)[0] as string) || "";
  });
}

export function isSnowflake(v: string): boolean {
  return /^\d{17,20}$/.test(v);
}

/**
 * Attempts to find a relevant audit log entry for the given user and action
 */
export async function findRelevantAuditLogEntry(
  bot,
  actionType: number,
  userId: string,
  attempts: number = 3,
  attemptDelay: number = 1500
): Promise<GuildAuditLogEntry> {
  const auditLogEntries = await this.bot.getGuildAuditLogs(this.guildId, 5, null, actionType);

  auditLogEntries.entries.sort((a, b) => {
    if (a.createdAt > b.createdAt) return -1;
    if (a.createdAt > b.createdAt) return 1;
    return 0;
  });

  const cutoffTS = Date.now() - 1000 * 60 * 2;

  const relevantEntry = auditLogEntries.entries.find(entry => {
    return entry.target.id === userId && entry.createdAt >= cutoffTS;
  });

  if (relevantEntry) {
    return relevantEntry;
  } else if (attempts > 0) {
    return findRelevantAuditLogEntry(bot, actionType, userId, attempts - 1, attemptDelay);
  } else {
    return null;
  }
}
