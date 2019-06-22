import { Entity, Column, PrimaryColumn, CreateDateColumn } from "typeorm";

@Entity("configs")
export class Config {
  @Column()
  @PrimaryColumn()
  id: number;

  @Column()
  key: string;

  @Column()
  config: string;

  @Column()
  is_active: boolean;

  @Column()
  edited_by: string;

  @Column()
  edited_at: string;
}
