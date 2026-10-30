import { NicknameHistorySchema } from "#database/schema";

export class NicknameHistoryEntry extends NicknameHistorySchema {
  static table = "nickname_history";
}

export default NicknameHistoryEntry;
