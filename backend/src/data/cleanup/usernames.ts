import moment from "moment-timezone";
import { getRepository, In } from "typeorm";
import { DAYS, DBDateFormat } from "../../utils";
import { connection } from "../db";
import { UsernameHistoryEntry } from "../entities/UsernameHistoryEntry";

export const USERNAME_RETENTION_PERIOD = 30 * DAYS;
const CLEAN_PER_LOOP = 500;

export async function cleanupUsernames(): Promise<number> {
  let cleaned = 0;

  const usernameHistoryRepository = getRepository(UsernameHistoryEntry);
  const dateThreshold = moment
    .utc()
    .subtract(USERNAME_RETENTION_PERIOD, "ms")
    .format(DBDateFormat);

  // Clean old usernames (USERNAME_RETENTION_PERIOD)
  let rows;
  do {
    rows = await connection.query(
      `
      SELECT id
      FROM username_history
      WHERE timestamp < ?
      LIMIT ${CLEAN_PER_LOOP}
    `,
      [dateThreshold],
    );

    if (rows.length > 0) {
      await usernameHistoryRepository.delete({
        id: In(rows.map(r => r.id)),
      });
    }

    cleaned += rows.length;
  } while (rows.length === CLEAN_PER_LOOP);

  return cleaned;
}
