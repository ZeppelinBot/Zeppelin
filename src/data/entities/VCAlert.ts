import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity("vc_alerts")
export class VCAlert {
  @Column()
  @PrimaryColumn()
  id: number;

  @Column() guild_id: string;

  @Column() requestor_id: string;

  @Column() user_id: string;

  @Column() channel_id: string;

  @Column() expires_at: string;

  @Column() body: string;
}
