import { RecentActionType } from "../constants";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger";

export const LinkSpamTrigger = createMessageSpamTrigger(RecentActionType.Link, "link");
