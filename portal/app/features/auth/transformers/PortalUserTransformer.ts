import type { PortalUser } from "#backend/features/auth/models/PortalUser";
import { BaseTransformer } from "@adonisjs/core/transformers";

export class PortalUserTransformer extends BaseTransformer<PortalUser> {
  toObject() {
    return this.pick(this.resource, ["userId", "username", "avatar"]);
  }
}

export default PortalUserTransformer;
