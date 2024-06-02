import { RecentActionType } from "../constants.js";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger.js";

export const EmojiSpamTrigger = createMessageSpamTrigger(RecentActionType.Emoji, "emoji");
