import { SlowmodeUserSchema } from "#database/schema";

export class SlowmodeUser extends SlowmodeUserSchema {
  static table = "slowmode_users";
}

export default SlowmodeUser;
