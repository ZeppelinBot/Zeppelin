import { RecentActionType } from "../constants";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger";

export const AttachmentSpamTrigger = createMessageSpamTrigger(RecentActionType.Attachment, "attachment");
