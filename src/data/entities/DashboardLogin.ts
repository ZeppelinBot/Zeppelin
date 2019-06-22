import { Entity, Column, PrimaryColumn } from "typeorm";
import { DashboardLoginUserData } from "../DashboardLogins";

@Entity("dashboard_logins")
export class DashboardLogin {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column()
  token: string;

  @Column()
  user_id: string;

  @Column("simple-json")
  user_data: DashboardLoginUserData;

  @Column()
  logged_in_at: string;

  @Column()
  expires_at: string;
}
