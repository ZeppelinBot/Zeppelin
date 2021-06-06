import { EmbedField, Message } from "discord.js";
import { EMPTY_CHAR, messageLink } from "../../../utils";
import { TStarboardOpts } from "../types";

export function createStarboardPseudoFooterForMessage(
  starboard: TStarboardOpts,
  msg: Message,
  starEmoji: string,
  starCount: number,
): EmbedField {
  const jumpLink = `[Jump to message](${messageLink(msg)})`;

  let content;
  if (starboard.show_star_count) {
    content =
      starCount > 1
        ? `${starEmoji} **${starCount}** \u200B \u200B \u200B ${jumpLink}`
        : `${starEmoji} \u200B ${jumpLink}`;
  } else {
    content = jumpLink;
  }

  return {
    name: EMPTY_CHAR,
    value: content,
    inline: false,
  };
}
