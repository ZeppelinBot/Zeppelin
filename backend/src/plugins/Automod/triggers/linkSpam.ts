import { RecentActionType } from "../constants.js";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger.js";

export const LinkSpamTrigger = createMessageSpamTrigger(RecentActionType.Link, "link");
