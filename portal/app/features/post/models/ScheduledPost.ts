import { ScheduledPostSchema } from "#database/schema";

export class ScheduledPost extends ScheduledPostSchema {
  static table = "scheduled_posts";
}

export default ScheduledPost;
