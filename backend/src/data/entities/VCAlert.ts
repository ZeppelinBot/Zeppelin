import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("vc_alerts")
export class VCAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column() guild_id: string;

  @Column() requestor_id: string;

  @Column() user_id: string;

  @Column() channel_id: string;

  @Column() expires_at: string;

  @Column() body: string;

  @Column() active: boolean;
}
