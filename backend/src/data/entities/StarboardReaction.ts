import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { SavedMessage } from "./SavedMessage";

@Entity("starboard_reactions")
export class StarboardReaction {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column()
  guild_id: string;

  @Column()
  message_id: string;

  @Column()
  reactor_id: string;

  @OneToOne((type) => SavedMessage)
  @JoinColumn({ name: "message_id" })
  message: SavedMessage;
}
