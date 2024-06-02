import moment from "moment-timezone";
import { In } from "typeorm";
import { DAYS, DBDateFormat } from "../../utils.js";
import { dataSource } from "../dataSource.js";
import { NicknameHistoryEntry } from "../entities/NicknameHistoryEntry.js";

export const NICKNAME_RETENTION_PERIOD = 30 * DAYS;
const CLEAN_PER_LOOP = 500;

export async function cleanupNicknames(): Promise<number> {
  let cleaned = 0;

  const nicknameHistoryRepository = dataSource.getRepository(NicknameHistoryEntry);
  const dateThreshold = moment.utc().subtract(NICKNAME_RETENTION_PERIOD, "ms").format(DBDateFormat);

  // Clean old nicknames (NICKNAME_RETENTION_PERIOD)
  let rows;
  do {
    rows = await dataSource.query(
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
        id: In(rows.map((r) => r.id)),
      });
    }

    cleaned += rows.length;
  } while (rows.length === CLEAN_PER_LOOP);

  return cleaned;
}
