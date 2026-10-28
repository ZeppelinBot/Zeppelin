import { ReactionRoleSchema } from "#database/schema";

export class ReactionRole extends ReactionRoleSchema {
  static table = "reaction_roles";
}

export default ReactionRole;
