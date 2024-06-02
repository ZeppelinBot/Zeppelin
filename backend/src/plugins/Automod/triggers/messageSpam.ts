import { RecentActionType } from "../constants.js";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger.js";

export const MessageSpamTrigger = createMessageSpamTrigger(RecentActionType.Message, "message");
