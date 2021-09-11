import { MigrationInterface, QueryRunner } from "typeorm";

const BATCH_SIZE = 200;

export class MigrateUsernamesToNewHistoryTable1556909512501 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    // Start by ending the migration transaction because this is gonna be a looooooooot of data
    await queryRunner.query("COMMIT");

    const migratedUsernames = new Set();

    await new Promise(async (resolve) => {
      const stream = await queryRunner.stream("SELECT CONCAT(user_id, '-', username) AS `key` FROM username_history");
      stream.on("data", (row: any) => {
        migratedUsernames.add(row.key);
      });
      stream.on("end", resolve);
    });

    const migrateNextBatch = (): Promise<{ finished: boolean; migrated?: number }> => {
      return new Promise(async (resolve) => {
        const toInsert: any[][] = [];
        const toDelete: number[] = [];

        const stream = await queryRunner.stream(
          `SELECT * FROM name_history WHERE type=1 ORDER BY timestamp ASC LIMIT ${BATCH_SIZE}`,
        );
        stream.on("data", (row: any) => {
          const key = `${row.user_id}-${row.value}`;

          if (!migratedUsernames.has(key)) {
            migratedUsernames.add(key);
            toInsert.push([row.user_id, row.value, row.timestamp]);
          }

          toDelete.push(row.id);
        });
        stream.on("end", async () => {
          if (toInsert.length || toDelete.length) {
            await queryRunner.query("START TRANSACTION");

            if (toInsert.length) {
              await queryRunner.query(
                "INSERT INTO username_history (user_id, username, timestamp) VALUES " +
                  Array.from({ length: toInsert.length }, () => "(?, ?, ?)").join(","),
                toInsert.flat(),
              );
            }

            if (toDelete.length) {
              await queryRunner.query(
                "DELETE FROM name_history WHERE id IN (" + Array.from("?".repeat(toDelete.length)).join(", ") + ")",
                toDelete,
              );
            }

            await queryRunner.query("COMMIT");

            resolve({ finished: false, migrated: toInsert.length });
          } else {
            resolve({ finished: true });
          }
        });
      });
    };

    while (true) {
      const result = await migrateNextBatch();
      if (result.finished) {
        break;
      } else {
        // tslint:disable-next-line:no-console
        console.log(`Migrated ${result.migrated} usernames`);
      }
    }

    await queryRunner.query("START TRANSACTION");
  }

  // tslint:disable-next-line:no-empty
  public async down(queryRunner: QueryRunner): Promise<any> {}
}
