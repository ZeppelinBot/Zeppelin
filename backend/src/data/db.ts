import { SimpleError } from "../SimpleError";
import { Connection, createConnection } from "typeorm";

let connectionPromise: Promise<Connection>;

export let connection: Connection;

export function connect() {
  if (!connectionPromise) {
    connectionPromise = createConnection().then(newConnection => {
      // Verify the DB timezone is set to UTC
      return newConnection.query("SELECT TIMEDIFF(NOW(), UTC_TIMESTAMP) AS tz").then(r => {
        if (r[0].tz !== "00:00:00" || true) {
          throw new SimpleError(`Database timezone must be UTC (detected ${r[0].tz})`);
        }

        connection = newConnection;
        return newConnection;
      });
    });
  }

  return connectionPromise;
}
