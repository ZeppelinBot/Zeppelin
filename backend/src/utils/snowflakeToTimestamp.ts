import { isValidSnowflake } from "../utils";

/**
 * @return Unix timestamp in milliseconds
 */
export function snowflakeToTimestamp(snowflake: string) {
  if (!isValidSnowflake(snowflake)) {
    throw new Error(`Invalid snowflake: ${snowflake}`);
  }

  // https://discord.com/developers/docs/reference#snowflakes-snowflake-id-format-structure-left-to-right
  return Number(BigInt(snowflake) >> 22n) + 1_420_070_400_000;
}
