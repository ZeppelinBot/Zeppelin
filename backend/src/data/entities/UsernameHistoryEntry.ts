import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("username_history")
export class UsernameHistoryEntry {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column() user_id: string;

  @Column() username: string;

  @Column() timestamp: string;
}
