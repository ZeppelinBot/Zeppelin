import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("supporters")
export class Supporter {
  @Column()
  @PrimaryColumn()
  user_id: string;

  @Column()
  name: string;

  @Column({ type: String, nullable: true })
  amount: string | null;
}
