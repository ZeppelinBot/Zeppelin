import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ApiUserInfo } from "./ApiUserInfo";

@Entity("api_permissions")
export class ApiPermissionAssignment {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  type: string;

  @Column()
  @PrimaryColumn()
  target_id: string;

  @Column("simple-array")
  permissions: string[];

  @ManyToOne((type) => ApiUserInfo, (userInfo) => userInfo.permissionAssignments)
  @JoinColumn({ name: "target_id" })
  userInfo: ApiUserInfo;
}
