import { ApiPermissionTypes } from "./ApiPermissionAssignments";

export const AuditLogEventTypes = {
  ADD_API_PERMISSION: "ADD_API_PERMISSION" as const,
  EDIT_API_PERMISSION: "EDIT_API_PERMISSION" as const,
  REMOVE_API_PERMISSION: "REMOVE_API_PERMISSION" as const,
  EDIT_CONFIG: "EDIT_CONFIG" as const,
};

export type AuditLogEventType = keyof typeof AuditLogEventTypes;

export type AddApiPermissionEventData = {
  target_id: string;
  permissions: string[];
  expires_at: string | null;
};

export type RemoveApiPermissionEventData = {
  target_id: string;
};

export type EditConfigEventData = {};

export interface AuditLogEventData extends Record<AuditLogEventType, unknown> {
  ADD_API_PERMISSION: {
    type: ApiPermissionTypes;
    target_id: string;
    permissions: string[];
    expires_at: string | null;
  };

  EDIT_API_PERMISSION: {
    type: ApiPermissionTypes;
    target_id: string;
    permissions: string[];
    expires_at: string | null;
  };

  REMOVE_API_PERMISSION: {
    type: ApiPermissionTypes;
    target_id: string;
  };

  EDIT_CONFIG: {};
}

export type AnyAuditLogEventData = AuditLogEventData[AuditLogEventType];
