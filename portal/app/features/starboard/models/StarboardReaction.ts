import { StarboardReactionSchema } from "#database/schema";

export class StarboardReaction extends StarboardReactionSchema {
  static table = "starboard_reactions";
}

export default StarboardReaction;
