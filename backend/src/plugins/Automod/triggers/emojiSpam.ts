import { RecentActionType } from "../constants";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger";

export const EmojiSpamTrigger = createMessageSpamTrigger(RecentActionType.Emoji, "emoji");
