import escapeStringRegexp from "escape-string-regexp";
import moment from "moment-timezone";

const normalizeTzName = str => str.replace(/[^a-zA-Z0-9+\-]/g, "").toLowerCase();

const validTimezones = moment.tz.names();
const normalizedTimezoneMap = validTimezones.reduce((map, tz) => {
  map.set(normalizeTzName(tz), tz);
  return map;
}, new Map());
const normalizedTimezones = Array.from(normalizedTimezoneMap.keys());

export function parseFuzzyTimezone(input: string) {
  const normalizedInput = normalizeTzName(input);

  if (normalizedTimezoneMap.has(normalizedInput)) {
    return normalizedTimezoneMap.get(normalizedInput);
  }

  const searchRegex = new RegExp(`.*${escapeStringRegexp(normalizedInput)}.*`);
  for (const tz of normalizedTimezones) {
    if (searchRegex.test(tz)) {
      const result = normalizedTimezoneMap.get(tz);
      // Ignore Etc/GMT timezones unless explicitly specified, as they have confusing functionality
      // with the inverted +/- sign
      if (result.startsWith("Etc/GMT")) continue;
      return result;
    }
  }

  return null;
}
