import { rootEnv } from "#start/env";

const staffUserIds = (rootEnv.get("STAFF") ?? "")
  .split(",")
  .map((v) => v.trim())
  .filter((v) => Boolean(v));

export function isStaff(userId: string) {
  return staffUserIds.includes(userId);
}
