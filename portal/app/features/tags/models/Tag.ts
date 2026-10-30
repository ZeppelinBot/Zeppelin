import { TagSchema } from "#database/schema";

export class Tag extends TagSchema {
  static table = "tags";
}

export default Tag;
