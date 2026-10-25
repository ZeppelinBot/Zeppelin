import { BaseModel, column } from "@adonisjs/lucid/orm";

export class PortalUser extends BaseModel {
  static table = "portal_users";

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare user_id: number;

  @column()
  declare username: string;

  @column()
  declare avatar: string;

  @column()
  declare created_at: string;
}

export default PortalUser
