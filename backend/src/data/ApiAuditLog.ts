import { Repository } from "typeorm/index";
import { BaseRepository } from "./BaseRepository";
import { AuditLogEventData, AuditLogEventType } from "./apiAuditLogTypes";
import { dataSource } from "./dataSource";
import { ApiAuditLogEntry } from "./entities/ApiAuditLogEntry";

export class ApiAuditLog extends BaseRepository {
  private auditLog: Repository<ApiAuditLogEntry<any>>;

  constructor() {
    super();
    this.auditLog = dataSource.getRepository(ApiAuditLogEntry);
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
