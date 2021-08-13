import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("context_menus")
export class ContextMenuLink {
  @Column() guild_id: string;

  @Column() @PrimaryColumn() context_id: string;

  @Column() action_name: string;
}
