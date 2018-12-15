import { Entity, Column, PrimaryColumn, OneToMany } from "typeorm";
import { CaseNote } from "./CaseNote";
import { StarboardMessage } from "./StarboardMessage";

@Entity("starboards")
export class Starboard {
  @Column()
  @PrimaryColumn()
  id: number;

  @Column() guild_id: string;

  @Column() channel_id: string;

  @Column() channel_whitelist: string;

  @Column() emoji: string;

  @Column() reactions_required: number;

  @OneToMany(type => StarboardMessage, msg => msg.starboard)
  starboardMessages: StarboardMessage[];
}
