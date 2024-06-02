import { RecentActionType } from "../constants.js";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger.js";

export const CharacterSpamTrigger = createMessageSpamTrigger(RecentActionType.Character, "character");
