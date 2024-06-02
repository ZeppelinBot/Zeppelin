import { RecentActionType } from "../constants.js";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger.js";

export const AttachmentSpamTrigger = createMessageSpamTrigger(RecentActionType.Attachment, "attachment");
