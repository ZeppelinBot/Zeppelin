import { Snowflake, SnowflakeUtil } from "discord.js";

export function idToTimestamp(id: string) {
  if (typeof id === "number") return null;
  return SnowflakeUtil.deconstruct(id as Snowflake).timestamp;
}
