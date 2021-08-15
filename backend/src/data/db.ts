import { Connection, createConnection } from "typeorm";
import { SimpleError } from "../SimpleError";

let connectionPromise: Promise<Connection>;

export let connection: Connection;

export function connect() {
  if (!connectionPromise) {
    connectionPromise = createConnection().then(async (newConnection) => {
      // Verify the DB timezone is set to UTC
      const r = await newConnection.query("SELECT TIMEDIFF(NOW(), UTC_TIMESTAMP) AS tz")
      if (r[0].tz !== "00:00:00") {
        throw new SimpleError(`Database timezone must be UTC (detected ${r[0].tz})`);
      }

      if (process.argv.includes('init')) {
        const staff = (process.env.STAFF ?? "").split(',');
        // Build the global config
        const config = {
          "prefix": "!",
          "owners": staff,
          "plugins": {
            "utility": {}
          }
        };

        await newConnection.query(`
          INSERT IGNORE INTO configs (id, \`key\`, config, is_active, edited_by)
          VALUES (1, "global", ?, true, 106391128718245888)
        `, [JSON.stringify(config)]);
      }
      connection = newConnection;
      return newConnection;
    });
  }

  return connectionPromise;
}
