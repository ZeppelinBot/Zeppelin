import { RecentActionType } from "../constants";
import { createMessageSpamTrigger } from "../functions/createMessageSpamTrigger";

export const CharacterSpamTrigger = createMessageSpamTrigger(RecentActionType.Character, "character");
