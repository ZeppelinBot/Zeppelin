import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { ApiLogin } from "./ApiLogin";
import { ApiPermissionAssignment } from "./ApiPermissionAssignment";

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

  @OneToMany((type) => ApiLogin, (login) => login.userInfo)
  logins: ApiLogin[];

  @OneToMany((type) => ApiPermissionAssignment, (p) => p.userInfo)
  permissionAssignments: ApiPermissionAssignment[];
}
