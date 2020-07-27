import { RecentActionType } from "../constants";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger";

export const MentionSpamTrigger = createMessageSpamTrigger(RecentActionType.Mention, "mention");
