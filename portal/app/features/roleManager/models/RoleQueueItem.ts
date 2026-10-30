import { RoleQueueSchema } from "#database/schema";

export class RoleQueueItem extends RoleQueueSchema {
  static table = "role_queue";
}

export default RoleQueueItem;
