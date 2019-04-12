import http, { ServerResponse } from "http";
import { GlobalPlugin, IPluginOptions, logger } from "knub";
import { GuildArchives } from "../data/GuildArchives";
import { sleep } from "../utils";
import moment from "moment-timezone";

const DEFAULT_PORT = 9920;
const archivesRegex = /^\/(spam-logs|archives)\/([a-z0-9\-]+)\/?$/i;

function notFound(res: ServerResponse) {
  res.statusCode = 404;
  res.end("Not Found");
}

interface ILogServerPluginConfig {
  port: number;
}

export class LogServerPlugin extends GlobalPlugin<ILogServerPluginConfig> {
  public static pluginName = "log_server";

  protected archives: GuildArchives;
  protected server: http.Server;

  protected getDefaultOptions(): IPluginOptions<ILogServerPluginConfig> {
    return {
      config: {
        port: DEFAULT_PORT,
      },
    };
  }

  async onLoad() {
    this.archives = new GuildArchives(null);

    this.server = http.createServer(async (req, res) => {
      const pathMatch = req.url.match(archivesRegex);
      if (!pathMatch) return notFound(res);

      const logId = pathMatch[2];

      if (pathMatch[1] === "spam-logs") {
        res.statusCode = 301;
        res.setHeader("Location", `/archives/${logId}`);
        return;
      }

      if (pathMatch) {
        const log = await this.archives.find(logId);
        if (!log) return notFound(res);

        let body = log.body;

        // Add some metadata at the end of the log file (but only if it doesn't already have it directly in the body)
        if (log.body.indexOf("Log file generated on") === -1) {
          const createdAt = moment(log.created_at).format("YYYY-MM-DD [at] HH:mm:ss [(+00:00)]");
          body += `\n\nLog file generated on ${createdAt}`;

          if (log.expires_at !== null) {
            const expiresAt = moment(log.expires_at).format("YYYY-MM-DD [at] HH:mm:ss [(+00:00)]");
            body += `\nExpires at ${expiresAt}`;
          }
        }

        res.setHeader("Content-Type", "text/plain; charset=UTF-8");
        res.end(body);
      }
    });

    const port = this.getConfig().port;
    let retried = false;

    this.server.on("error", async (err: any) => {
      if (err.code === "EADDRINUSE" && !retried) {
        logger.info("Got EADDRINUSE, retrying in 2 sec...");
        retried = true;
        await sleep(2000);
        this.server.listen(port);
      } else {
        throw err;
      }
    });

    this.server.listen(port);
  }

  async onUnload() {
    return new Promise(resolve => {
      this.server.close(() => resolve());
    });
  }
}
