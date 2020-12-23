import { Client, GuildTextableChannel, Message } from "eris";
import { noop } from "../../../utils";
import { createStarboardPseudoFooterForMessage } from "./createStarboardPseudoFooterForMessage";
import { TStarboardOpts } from "../types";

export async function updateStarboardMessageStarCount(
  starboard: TStarboardOpts,
  originalMessage: Message,
  starboardMessage: Message,
  starEmoji: string,
  starCount: number,
) {
  const embed = starboardMessage.embeds[0]!;
  embed.fields!.shift(); // Remove pseudo footer
  embed.fields!.push(createStarboardPseudoFooterForMessage(starboard, originalMessage, starEmoji, starCount)); // Create new pseudo footer
  await starboardMessage.edit({ embed });
}
