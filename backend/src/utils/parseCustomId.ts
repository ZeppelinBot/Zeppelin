import { logger } from "../logger";

const customIdFormat = /^([^:]+):\d+:(.*)$/;

export function parseCustomId(customId: string): { namespace: string; data: any } {
  const parts = customId.match(customIdFormat);
  if (!parts) {
    return {
      namespace: "",
      data: null,
    };
  }

  let parsedData: any;
  try {
    parsedData = JSON.parse(parts[2]);
  } catch (err) {
    logger.debug(`Error while parsing custom id data (custom id: ${customId}): ${String(err)}`);
    return {
      namespace: "",
      data: null,
    };
  }

  return {
    namespace: parts[1],
    // Skipping timestamp
    data: JSON.parse(parts[2]),
  };
}
