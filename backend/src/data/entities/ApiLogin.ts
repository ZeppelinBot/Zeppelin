import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from "typeorm";
import { ApiUserInfo } from "./ApiUserInfo.js";

@Entity("api_logins")
export class ApiLogin {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column()
  token: string;

  @Column()
  user_id: string;

  @Column()
  logged_in_at: string;

  @Column()
  expires_at: string;

  @ManyToOne(() => ApiUserInfo, (userInfo) => userInfo.logins)
  @JoinColumn({ name: "user_id" })
  userInfo: Relation<ApiUserInfo>;
}
