// KEEP THIS AS FIRST IMPORT
// See comment in module for details
import "../threadsSignalFix.js";

import { connect } from "../data/db.js";
import { env } from "../env.js";
import { setIsAPI } from "../globals.js";

if (!env.KEY) {
  // tslint:disable-next-line:no-console
  console.error("Project root .env with KEY is required!");
  process.exit(1);
}

function errorHandler(err) {
  console.error(err.stack || err); // tslint:disable-line:no-console
  process.exit(1);
}

process.on("unhandledRejection", errorHandler);

setIsAPI(true);

// Connect to the database before loading the rest of the code (that depend on the database connection)
console.log("Connecting to database..."); // tslint:disable-line
connect().then(() => {
  import("./start.js");
});
