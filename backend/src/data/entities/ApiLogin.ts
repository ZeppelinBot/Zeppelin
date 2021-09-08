import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ApiUserInfo } from "./ApiUserInfo";

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

  @ManyToOne((type) => ApiUserInfo, (userInfo) => userInfo.logins)
  @JoinColumn({ name: "user_id" })
  userInfo: ApiUserInfo;
}
