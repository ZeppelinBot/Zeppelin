import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ApiUserInfo } from "./ApiUserInfo.js";

@Entity("configs")
export class Config {
  @Column()
  @PrimaryColumn()
  id: number;

  @Column()
  key: string;

  @Column()
  config: string;

  @Column()
  is_active: boolean;

  @Column()
  edited_by: string;

  @Column()
  edited_at: string;

  @ManyToOne(() => ApiUserInfo)
  @JoinColumn({ name: "edited_by" })
  userInfo: ApiUserInfo;
}
