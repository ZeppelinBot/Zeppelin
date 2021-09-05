import { BaseRepository } from "./BaseRepository";
import { getRepository, Repository } from "typeorm/index";
import { ApiAuditLogEntry } from "./entities/ApiAuditLogEntry";
import { ApiLogin } from "./entities/ApiLogin";
import { AuditLogEventData, AuditLogEventType } from "./apiAuditLogTypes";

export class ApiAuditLog extends BaseRepository {
  private auditLog: Repository<ApiAuditLogEntry<any>>;

  constructor() {
    super();
    this.auditLog = getRepository(ApiAuditLogEntry);
  }

  addEntry<TEventType extends AuditLogEventType>(
    guildId: string,
    authorId: string,
    eventType: TEventType,
    eventData: AuditLogEventData[TEventType],
  ) {
    this.auditLog.insert({
      guild_id: guildId,
      author_id: authorId,
      event_type: eventType as any,
      event_data: eventData as any,
    });
  }
}
