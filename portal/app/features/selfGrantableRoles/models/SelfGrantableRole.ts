import { SelfGrantableRoleSchema } from "#database/schema";

export class SelfGrantableRole extends SelfGrantableRoleSchema {
  static table = "self_grantable_roles";
}

export default SelfGrantableRole;
