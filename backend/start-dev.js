/**
 * This file starts the bot and api processes in tandem.
 * Used with tsc-watch for restarting on watch.
 */

const childProcess = require("child_process");

const cmd = process.platform === "win32" ? "npm.cmd" : "npm";

childProcess.spawn(cmd, ["run", "start-bot-dev"], {
  stdio: [process.stdin, process.stdout, process.stderr],
});

childProcess.spawn(cmd, ["run", "start-api-dev"], {
  stdio: [process.stdin, process.stdout, process.stderr],
});
