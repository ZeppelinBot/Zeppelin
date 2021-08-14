import moment from "moment-timezone";
import { getRepository, In } from "typeorm";
import { DBDateFormat } from "../../utils";
import { connection } from "../db";
import { Config } from "../entities/Config";

const CLEAN_PER_LOOP = 50;

export async function cleanupConfigs() {
  const configRepository = getRepository(Config);

  let cleaned = 0;
  let rows;

  // >1 month old: 1 config retained per month
  const oneMonthCutoff = moment
    .utc()
    .subtract(30, "days")
    .format(DBDateFormat);
  do {
    rows = await connection.query(
      `
      WITH _configs
      AS (
        SELECT
          id,
          \`key\`,
          YEAR(edited_at) AS \`year\`,
          MONTH(edited_at) AS \`month\`,
          ROW_NUMBER() OVER (
            PARTITION BY \`key\`, \`year\`, \`month\`
            ORDER BY edited_at
          ) AS row_num
        FROM
          configs
        WHERE
          is_active = 0
          AND edited_at < ?
      )
      SELECT *
      FROM _configs
      WHERE row_num > 1
    `,
      [oneMonthCutoff],
    );

    if (rows.length > 0) {
      await configRepository.delete({
        id: In(rows.map(r => r.id)),
      });
    }

    cleaned += rows.length;
  } while (rows.length === CLEAN_PER_LOOP);

  // >2 weeks old: 1 config retained per day
  const twoWeekCutoff = moment
    .utc()
    .subtract(2, "weeks")
    .format(DBDateFormat);
  do {
    rows = await connection.query(
      `
      WITH _configs
      AS (
        SELECT
          id,
          \`key\`,
          DATE(edited_at) AS \`date\`,
          ROW_NUMBER() OVER (
            PARTITION BY \`key\`, \`date\`
            ORDER BY edited_at
          ) AS row_num
        FROM
          configs
        WHERE
          is_active = 0
          AND edited_at < ?
          AND edited_at >= ?
      )
      SELECT *
      FROM _configs
      WHERE row_num > 1
    `,
      [twoWeekCutoff, oneMonthCutoff],
    );

    if (rows.length > 0) {
      await configRepository.delete({
        id: In(rows.map(r => r.id)),
      });
    }

    cleaned += rows.length;
  } while (rows.length === CLEAN_PER_LOOP);

  return cleaned;
}
