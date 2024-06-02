import { Column, Entity, OneToMany, PrimaryColumn, Relation } from "typeorm";
import { ApiLogin } from "./ApiLogin.js";
import { ApiPermissionAssignment } from "./ApiPermissionAssignment.js";

export interface ApiUserInfoData {
  username: string;
  discriminator: string;
  avatar: string;
}

@Entity("api_user_info")
export class ApiUserInfo {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column("simple-json")
  data: ApiUserInfoData;

  @Column()
  updated_at: string;

  @OneToMany(() => ApiLogin, (login) => login.userInfo)
  logins: Relation<ApiLogin[]>;

  @OneToMany(() => ApiPermissionAssignment, (p) => p.userInfo)
  permissionAssignments: Relation<ApiPermissionAssignment[]>;
}
