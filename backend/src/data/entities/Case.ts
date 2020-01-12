import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { CaseNote } from "./CaseNote";

@Entity("cases")
export class Case {
  @PrimaryGeneratedColumn() id: number;

  @Column() guild_id: string;

  @Column() case_number: number;

  @Column() user_id: string;

  @Column() user_name: string;

  @Column() mod_id: string;

  @Column() mod_name: string;

  @Column() type: number;

  @Column() audit_log_id: string;

  @Column() created_at: string;

  @Column() is_hidden: boolean;

  @Column() pp_id: string;

  @Column() pp_name: string;

  @OneToMany(
    type => CaseNote,
    note => note.case,
  )
  notes: CaseNote[];
}
