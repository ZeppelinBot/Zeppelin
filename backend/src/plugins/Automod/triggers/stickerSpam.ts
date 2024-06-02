import { RecentActionType } from "../constants.js";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger.js";

export const StickerSpamTrigger = createMessageSpamTrigger(RecentActionType.Sticker, "sticker");
