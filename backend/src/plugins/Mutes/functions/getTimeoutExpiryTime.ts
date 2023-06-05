import { MAX_TIMEOUT_DURATION } from "../../../data/Mutes";

/**
 * Since timeouts have a limited duration (max 28d) but we support mutes longer than that,
 * the timeouts are applied for a certain duration at first and then renewed as necessary.
 * This function returns the initial end time for a timeout.
 * @return - Timeout expiry timestamp
 */
export function getTimeoutExpiryTime(muteExpiresAt: number | null | undefined): number {
  if (muteExpiresAt && muteExpiresAt - Date.now() <= MAX_TIMEOUT_DURATION) {
    return muteExpiresAt;
  }
  return Date.now() + MAX_TIMEOUT_DURATION;
}
