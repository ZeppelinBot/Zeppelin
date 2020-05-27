import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity("supporters")
export class Supporter {
  @Column()
  @PrimaryColumn()
  user_id: string;

  @Column()
  name: string;

  @Column()
  amount: string | null;
}
