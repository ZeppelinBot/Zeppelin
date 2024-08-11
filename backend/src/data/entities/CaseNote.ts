import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Case } from "./Case.js";

@Entity("case_notes")
export class CaseNote {
  @PrimaryGeneratedColumn() id: number;

  @Column() case_id: number;

  @Column() mod_id: string;

  @Column() mod_name: string;

  @Column() body: string;

  @Column() created_at: string;

  @ManyToOne(() => Case, (theCase) => theCase.notes)
  @JoinColumn({ name: "case_id" })
  case: Case;
}
