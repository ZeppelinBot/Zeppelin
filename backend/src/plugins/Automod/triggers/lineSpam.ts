import { RecentActionType } from "../constants.js";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger.js";

export const LineSpamTrigger = createMessageSpamTrigger(RecentActionType.Line, "line");
