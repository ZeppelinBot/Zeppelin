import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import { ApiUserInfo } from "./ApiUserInfo";

@Entity("api_permissions")
export class ApiPermission {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  user_id: string;

  @Column()
  role: string;

  @ManyToOne(type => ApiUserInfo, userInfo => userInfo.permissions)
  @JoinColumn({ name: "user_id" })
  userInfo: ApiUserInfo;
}
