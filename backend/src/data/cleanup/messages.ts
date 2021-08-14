import moment from "moment-timezone";
import { getRepository, In } from "typeorm";
import { DAYS, DBDateFormat, MINUTES } from "../../utils";
import { connection } from "../db";
import { SavedMessage } from "../entities/SavedMessage";

/**
 * How long message edits, deletions, etc. will include the original message content.
 * This is very heavy storage-wise, so keeping it as low as possible is ideal.
 */
const RETENTION_PERIOD = 1 * DAYS;
const BOT_MESSAGE_RETENTION_PERIOD = 30 * MINUTES;
const DELETED_MESSAGE_RETENTION_PERIOD = 5 * MINUTES;
const CLEAN_PER_LOOP = 500;

export async function cleanupMessages(): Promise<number> {
  let cleaned = 0;

  const messagesRepository = getRepository(SavedMessage);

  const deletedAtThreshold = moment
    .utc()
    .subtract(DELETED_MESSAGE_RETENTION_PERIOD, "ms")
    .format(DBDateFormat);
  const postedAtThreshold = moment
    .utc()
    .subtract(RETENTION_PERIOD, "ms")
    .format(DBDateFormat);
  const botPostedAtThreshold = moment
    .utc()
    .subtract(BOT_MESSAGE_RETENTION_PERIOD, "ms")
    .format(DBDateFormat);

  // SELECT + DELETE messages in batches
  // This is to avoid deadlocks that happened frequently when deleting with the same criteria as the select below
  // when a message was being inserted at the same time
  let rows;
  do {
    rows = await connection.query(
      `
      SELECT id
      FROM messages
      WHERE (
          deleted_at IS NOT NULL
          AND deleted_at <= ?
        )
         OR (
          posted_at <= ?
          AND is_permanent = 0
        )
         OR (
          is_bot = 1
          AND posted_at <= ?
          AND is_permanent = 0
        )
      LIMIT ${CLEAN_PER_LOOP}
    `,
      [deletedAtThreshold, postedAtThreshold, botPostedAtThreshold],
    );

    if (rows.length > 0) {
      await messagesRepository.delete({
        id: In(rows.map(r => r.id)),
      });
    }

    cleaned += rows.length;
  } while (rows.length === CLEAN_PER_LOOP);

  return cleaned;
}
