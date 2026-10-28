import { StarboardMessageSchema } from "#database/schema";

export class StarboardMessage extends StarboardMessageSchema {
  static table = "starboard_messages";
}

export default StarboardMessage;
