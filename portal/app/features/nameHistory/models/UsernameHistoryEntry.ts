import { UsernameHistorySchema } from "#database/schema";

export class UsernameHistoryEntry extends UsernameHistorySchema {
  static table = "username_history";
}

export default UsernameHistoryEntry;
