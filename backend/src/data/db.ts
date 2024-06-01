import { SimpleError } from "../SimpleError.js";
import { dataSource } from "./dataSource.js";

let connectionPromise: Promise<void>;

export function connect() {
  if (!connectionPromise) {
    connectionPromise = dataSource.initialize().then(async (initializedDataSource) => {
      const tzResult = await initializedDataSource.query("SELECT TIMEDIFF(NOW(), UTC_TIMESTAMP) AS tz");
      if (tzResult[0].tz !== "00:00:00") {
        throw new SimpleError(`Database timezone must be UTC (detected ${tzResult[0].tz})`);
      }
    });
  }

  return connectionPromise;
}

export function disconnect() {
  if (connectionPromise) {
    connectionPromise.then(() => dataSource.destroy());
  }
}
