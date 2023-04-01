import { MAX_TIMEOUT_DURATION } from "../../../data/Mutes";

/**
 * Since timeouts have a limited duration (max 28d) but we support mutes longer than that,
 * the timeouts are applied for a certain duration at first and then renewed as necessary.
 * This function returns the initial end time for a timeout.
 * @param muteTime Time to mute for in ms
 * @return - Timestamp of the
 */
export function getTimeoutExpiryTime(muteExpiresAt: number | null | undefined): number {
  if (muteExpiresAt && muteExpiresAt <= MAX_TIMEOUT_DURATION) {
    return muteExpiresAt;
  }
  return Date.now() + MAX_TIMEOUT_DURATION;
}
