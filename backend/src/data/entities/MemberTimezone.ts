import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("member_timezones")
export class MemberTimezone {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  member_id: string;

  @Column() timezone: string;
}
