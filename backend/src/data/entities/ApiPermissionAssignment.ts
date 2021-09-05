import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ApiUserInfo } from "./ApiUserInfo";
import { ApiPermissionTypes } from "../ApiPermissionAssignments";

@Entity("api_permissions")
export class ApiPermissionAssignment {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column({ type: "string" })
  @PrimaryColumn()
  type: ApiPermissionTypes;

  @Column()
  @PrimaryColumn()
  target_id: string;

  @Column("simple-array")
  permissions: string[];

  @Column()
  expires_at: string;

  @ManyToOne(
    type => ApiUserInfo,
    userInfo => userInfo.permissionAssignments,
  )
  @JoinColumn({ name: "target_id" })
  userInfo: ApiUserInfo;
}
