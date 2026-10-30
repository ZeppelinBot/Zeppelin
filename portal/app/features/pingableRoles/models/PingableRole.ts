import { PingableRoleSchema } from "#database/schema";

export class PingableRole extends PingableRoleSchema {
  static table = "pingable_roles";
}

export default PingableRole;
