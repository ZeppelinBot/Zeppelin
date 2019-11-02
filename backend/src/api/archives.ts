import express, { Request, Response } from "express";
import { GuildArchives } from "../data/GuildArchives";
import { notFound } from "./responses";
import moment from "moment-timezone";

export function initArchives(app: express.Express) {
  const archives = new GuildArchives(null);

  // Legacy redirect
  app.get("/spam-logs/:id", (req: Request, res: Response) => {
    res.redirect("/archives/" + req.params.id);
  });

  app.get("/archives/:id", async (req: Request, res: Response) => {
    const archive = await archives.find(req.params.id);
    if (!archive) return notFound(res);

    let body = archive.body;

    // Add some metadata at the end of the log file (but only if it doesn't already have it directly in the body)
    if (archive.body.indexOf("Log file generated on") === -1) {
      const createdAt = moment(archive.created_at).format("YYYY-MM-DD [at] HH:mm:ss [(+00:00)]");
      body += `\n\nLog file generated on ${createdAt}`;

      if (archive.expires_at !== null) {
        const expiresAt = moment(archive.expires_at).format("YYYY-MM-DD [at] HH:mm:ss [(+00:00)]");
        body += `\nExpires at ${expiresAt}`;
      }
    }

    res.setHeader("Content-Type", "text/plain; charset=UTF-8");
    res.end(body);
  });
}
