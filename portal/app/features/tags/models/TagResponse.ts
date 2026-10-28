import { TagResponseSchema } from "#database/schema";

export class TagResponse extends TagResponseSchema {
  static table = "tag_responses";
}

export default TagResponse;
