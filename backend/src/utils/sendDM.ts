import { createChunkedMessage, HOURS, isDiscordRESTError } from "../utils";
import { logger } from "../logger";
import Timeout = NodeJS.Timeout;
import { APIMessage, User } from "discord.js";

let dmsDisabled = false;
let dmsDisabledTimeout: Timeout;

function disableDMs(duration) {
  dmsDisabled = true;
  clearTimeout(dmsDisabledTimeout);
  dmsDisabledTimeout = setTimeout(() => (dmsDisabled = false), duration);
}

export class DMError extends Error {}

const error20026 = "The bot cannot currently send DMs";

export async function sendDM(user: User, content: string | APIMessage, source: string) {
  if (dmsDisabled) {
    throw new DMError(error20026);
  }

  logger.debug(`Sending ${source} DM to ${user.id}`);

  try {
    if (typeof content === "string") {
      await createChunkedMessage(user, content);
    } else {
      await user.send(content);
    }
  } catch (e) {
    if (isDiscordRESTError(e) && e.code === 20026) {
      logger.warn(`Received error code 20026: ${e.message}`);
      logger.warn("Disabling attempts to send DMs for 1 hour");
      disableDMs(1 * HOURS);
      throw new DMError(error20026);
    }

    throw e;
  }
}
