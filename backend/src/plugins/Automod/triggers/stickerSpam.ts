import { RecentActionType } from "../constants";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger";

export const StickerSpamTrigger = createMessageSpamTrigger(RecentActionType.Sticker, "sticker");
