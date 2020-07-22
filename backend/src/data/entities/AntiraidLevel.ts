import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("antiraid_levels")
export class AntiraidLevel {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  level: string;
}
