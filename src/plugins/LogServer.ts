import http, { ServerResponse } from "http";
import { GlobalPlugin } from "knub";
import { GuildSpamLogs } from "../data/GuildSpamLogs";
import { sleep } from "../utils";

const DEFAULT_PORT = 9920;
const logUrlRegex = /^\/spam-logs\/([a-z0-9\-]+)\/?$/i;

function notFound(res: ServerResponse) {
  res.statusCode = 404;
  res.end("Not Found");
}

/**
 * A global plugin that allows bot owners to control the bot
 */
export class LogServerPlugin extends GlobalPlugin {
  protected spamLogs: GuildSpamLogs;
  protected server: http.Server;

  async onLoad() {
    this.spamLogs = new GuildSpamLogs(null);

    this.server = http.createServer(async (req, res) => {
      const logId = req.url.match(logUrlRegex);
      if (!logId) return notFound(res);

      if (logId) {
        const log = await this.spamLogs.find(logId[1]);
        if (!log) return notFound(res);

        res.setHeader("Content-Type", "text/plain; charset=UTF-8");
        res.end(log.body);
      }
    });

    let retried = false;

    this.server.on("error", async (err: any) => {
      if (err.code === "EADDRINUSE" && !retried) {
        console.log("Got EADDRINUSE, retrying in 2 sec...");
        retried = true;
        await sleep(2000);
        this.server.listen(this.configValue("port", DEFAULT_PORT));
      } else {
        throw err;
      }
    });

    this.server.listen(this.configValue("port", DEFAULT_PORT));
  }

  async onUnload() {
    return new Promise(resolve => {
      this.server.close(() => resolve());
    });
  }
}
