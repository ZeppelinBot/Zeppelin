import moment from "moment-timezone";

const validTimezones = moment.tz.names();

export function isValidTimezone(input: string) {
  return validTimezones.includes(input);
}
