import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { CaseNote } from "./CaseNote";

@Entity("cases")
export class Case {
  @PrimaryGeneratedColumn() id: number;

  @Column() guild_id: string;

  @Column() case_number: number;

  @Column() user_id: string;

  @Column() user_name: string;

  @Column({ nullable: true }) mod_id: string | null;

  @Column({ nullable: true }) mod_name: string | null;

  @Column() type: number;

  @Column({ nullable: true }) audit_log_id: string | null;

  @Column() created_at: string;

  @Column() is_hidden: boolean;

  @Column({ nullable: true }) pp_id: string | null;

  @Column({ nullable: true }) pp_name: string | null;

  /**
   * ID of the channel and message where this case was logged.
   * Format: "channelid-messageid"
   */
  @Column({ nullable: true }) log_message_id: string | null;

  @OneToMany(
    type => CaseNote,
    note => note.case,
  )
  notes: CaseNote[];
}
