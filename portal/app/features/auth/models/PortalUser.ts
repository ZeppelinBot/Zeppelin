import { PortalUserSchema } from "#database/schema";

export class PortalUser extends PortalUserSchema {
  static table = "portal_users";
}

export default PortalUser;
