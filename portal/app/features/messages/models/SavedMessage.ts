import { MessageSchema } from "#database/schema";

export class SavedMessage extends MessageSchema {
  static table = "messages";
}

export default SavedMessage;
