import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("webhooks")
export class Webhook {
  @Column()
  @PrimaryColumn()
  id: string;

  @Column() guild_id: string;

  @Column() channel_id: string;

  @Column() token: string;
}
