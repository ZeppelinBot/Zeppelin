import path from "path";
import { Connection, createConnection } from "typeorm";
import { backendDir } from "../paths";
import { SimpleError } from "../SimpleError";
import { QueryLogger } from "./queryLogger";

const ormconfigPath = path.join(backendDir, "ormconfig.js");
const connectionOptions = require(ormconfigPath);

let connectionPromise: Promise<Connection>;

export let connection: Connection;

export function connect() {
  if (!connectionPromise) {
    connectionPromise = createConnection({
      ...(connectionOptions as any),
      logging: ["query", "error"],
      logger: new QueryLogger(),
    }).then((newConnection) => {
      // Verify the DB timezone is set to UTC
      return newConnection.query("SELECT TIMEDIFF(NOW(), UTC_TIMESTAMP) AS tz").then((r) => {
        if (r[0].tz !== "00:00:00") {
          throw new SimpleError(`Database timezone must be UTC (detected ${r[0].tz})`);
        }

        connection = newConnection;
        return newConnection;
      });
    });
  }

  return connectionPromise;
}
