import { Snowflake, SnowflakeUtil } from "discord.js";

export function idToTimestamp(id: string): string | null {
  if (typeof id === "number") return null;
  return SnowflakeUtil.deconstruct(id as Snowflake).timestamp.toString();
}
