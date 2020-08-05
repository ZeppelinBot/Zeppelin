/**
 * @return Unix timestamp in milliseconds
 */
export function snowflakeToTimestamp(snowflake: string) {
  // https://discord.com/developers/docs/reference#snowflakes-snowflake-id-format-structure-left-to-right
  return Number(BigInt(snowflake) >> 22n) + 1420070400000;
}
