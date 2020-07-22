import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("reminders")
export class Reminder {
  @Column()
  @PrimaryColumn()
  id: number;

  @Column() guild_id: string;

  @Column() user_id: string;

  @Column() channel_id: string;

  @Column() remind_at: string;

  @Column() body: string;

  @Column() created_at: string;
}
