import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ApiUserInfo } from "./ApiUserInfo";
import { AuditLogEventData, AuditLogEventType } from "../apiAuditLogTypes";

@Entity("api_audit_log")
export class ApiAuditLogEntry<TEventType extends AuditLogEventType> {
  @Column()
  @PrimaryColumn()
  id: number;

  @Column()
  guild_id: string;

  @Column()
  author_id: string;

  @Column({ type: String })
  event_type: TEventType;

  @Column("simple-json")
  event_data: AuditLogEventData[TEventType];

  @Column()
  created_at: string;
}
