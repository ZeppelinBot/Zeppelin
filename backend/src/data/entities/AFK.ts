import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("afk")
export class AFK {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column()
  user_id: string;

  @Column()
  status: string;
}
