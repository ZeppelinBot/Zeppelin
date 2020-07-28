import { RecentActionType } from "../constants";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger";

export const LineSpamTrigger = createMessageSpamTrigger(RecentActionType.Line, "line");
