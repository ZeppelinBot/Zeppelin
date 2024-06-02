import { RecentActionType } from "../constants.js";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger.js";

export const MentionSpamTrigger = createMessageSpamTrigger(RecentActionType.Mention, "mention");
