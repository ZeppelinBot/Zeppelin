import { RecentActionType } from "../constants";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger";

export const MessageSpamTrigger = createMessageSpamTrigger(RecentActionType.Message, "message");
