import { Message } from "discord.js";
import { TStarboardOpts } from "../types";
import { createStarboardPseudoFooterForMessage } from "./createStarboardPseudoFooterForMessage";
import Timeout = NodeJS.Timeout;

const DEBOUNCE_DELAY = 1000;
const debouncedUpdates: Record<string, Timeout> = {};

export async function updateStarboardMessageStarCount(
  starboard: TStarboardOpts,
  originalMessage: Message,
  starboardMessage: Message,
  starEmoji: string,
  starCount: number,
) {
  const key = `${originalMessage.id}-${starboardMessage.id}`;
  if (debouncedUpdates[key]) {
    clearTimeout(debouncedUpdates[key]);
  }

  debouncedUpdates[key] = setTimeout(() => {
    delete debouncedUpdates[key];
    const embed = starboardMessage.embeds[0]!;
    embed.fields!.pop(); // Remove pseudo footer
    embed.fields!.push(createStarboardPseudoFooterForMessage(starboard, originalMessage, starEmoji, starCount)); // Create new pseudo footer
    starboardMessage.edit({ embeds: [embed] });
  }, DEBOUNCE_DELAY);
}
