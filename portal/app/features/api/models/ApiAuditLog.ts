import { ApiAuditLogSchema } from "#database/schema";

export class ApiAuditLog extends ApiAuditLogSchema {
  static table = "api_audit_log";
}

export default ApiAuditLog;
