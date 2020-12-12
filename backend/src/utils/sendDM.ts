import { MessageContent, MessageFile, User } from "eris";
import { createChunkedMessage, HOURS, isDiscordRESTError } from "../utils";
import { logger } from "../logger";
import Timeout = NodeJS.Timeout;

let dmsDisabled = false;
let dmsDisabledTimeout: Timeout;

function disableDMs(duration) {
  dmsDisabled = true;
  clearTimeout(dmsDisabledTimeout);
  dmsDisabledTimeout = setTimeout(() => (dmsDisabled = false), duration);
}

export class DMError extends Error {}

const error20026 = "The bot cannot currently send DMs";

export async function sendDM(user: User, content: MessageContent, source: string) {
  if (dmsDisabled) {
    throw new DMError(error20026);
  }

  logger.debug(`Sending ${source} DM to ${user.id}`);

  try {
    const dmChannel = await user.getDMChannel();
    if (!dmChannel) {
      throw new DMError("Unable to open DM channel");
    }

    if (typeof content === "string") {
      await createChunkedMessage(dmChannel, content);
    } else {
      await dmChannel.createMessage(content);
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
