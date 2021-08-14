import moment from "moment-timezone";
import { getRepository, In } from "typeorm";
import { DAYS, DBDateFormat } from "../../utils";
import { connection } from "../db";
import { NicknameHistoryEntry } from "../entities/NicknameHistoryEntry";

export const NICKNAME_RETENTION_PERIOD = 30 * DAYS;
const CLEAN_PER_LOOP = 500;

export async function cleanupNicknames(): Promise<number> {
  let cleaned = 0;

  const nicknameHistoryRepository = getRepository(NicknameHistoryEntry);
  const dateThreshold = moment
    .utc()
    .subtract(NICKNAME_RETENTION_PERIOD, "ms")
    .format(DBDateFormat);

  // Clean old nicknames (NICKNAME_RETENTION_PERIOD)
  let rows;
  do {
    rows = await connection.query(
      `
      SELECT id
      FROM nickname_history
      WHERE timestamp < ?
      LIMIT ${CLEAN_PER_LOOP}
    `,
      [dateThreshold],
    );

    if (rows.length > 0) {
      await nicknameHistoryRepository.delete({
        id: In(rows.map(r => r.id)),
      });
    }

    cleaned += rows.length;
  } while (rows.length === CLEAN_PER_LOOP);

  return cleaned;
}
