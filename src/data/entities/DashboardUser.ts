import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity("dashboard_users")
export class DashboardUser {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  user_id: string;

  @Column()
  username: string;

  @Column()
  role: string;
}
