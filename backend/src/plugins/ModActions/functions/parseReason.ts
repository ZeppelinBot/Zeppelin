const MAX_REASON_LENGTH = 512;

export function parseReason(config: any, reason: string): string {
  if (!reason) return reason;
  if (config?.reason_aliases) {
    reason = config.reason_aliases![reason.toLowerCase()] ?? reason;
  }
  if (reason!.length > MAX_REASON_LENGTH) {
    reason = reason!.substring(0, MAX_REASON_LENGTH - 6) + " [...]";
  }
  return reason;
}
