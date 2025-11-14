/**
 * This file starts the bot and api processes in tandem.
 * Used with tsc-watch for restarting on watch.
 */

import childProcess from "node:child_process";

childProcess.spawn("pnpm", ["run", "start-bot-dev"], {
  stdio: [process.stdin, process.stdout, process.stderr],
});

childProcess.spawn("pnpm", ["run", "start-api-dev"], {
  stdio: [process.stdin, process.stdout, process.stderr],
});
