import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("role_queue")
export class RoleQueueItem {
  @PrimaryGeneratedColumn() id: number;

  @Column() guild_id: string;

  @Column() user_id: string;

  @Column() role_id: string;

  @Column() should_add: boolean;

  @Column() priority: number;
}
