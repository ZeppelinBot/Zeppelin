import type { PortalUser } from "#backend/features/portalUsers/models/PortalUser";
import { BaseTransformer } from "@adonisjs/core/transformers";

export class PortalUserTransformer extends BaseTransformer<PortalUser> {
  toObject() {
    return this.pick(this.resource, ["user_id", "username", "avatar"]);
  }
}

export default PortalUserTransformer;
