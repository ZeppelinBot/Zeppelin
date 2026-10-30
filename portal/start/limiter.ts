/*
|--------------------------------------------------------------------------
| Define HTTP limiters
|--------------------------------------------------------------------------
|
| The "limiter.define" method creates an HTTP middleware to apply rate
| limits on a route or a group of routes. Feel free to define as many
| throttle middleware as needed.
|
*/

import limiter from "@adonisjs/limiter/services/main";
import PortalDataExport from "#backend/features/dataExport/models/PortalDataExport";
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

const newDataDownloadThrottle = limiter.define("dataDownload", (ctx) => {
  return limiter
    .allowRequests(1)
    .every("5 minutes")
    .usingKey(`user_${ctx.auth.user?.discordUserId ?? "anonymous"}`);
});

export async function dataDownloadThrottle(ctx: HttpContext, next: NextFn) {
  const existing = await PortalDataExport.findBy("ref", `user-${ctx.auth.user!.discordUserId}`);
  if (existing && existing.status !== "failed") {
    return next();
  }
  return newDataDownloadThrottle(ctx, next);
}

export const dataDeleteThrottle = limiter.define("dataDelete", (ctx) => {
  return limiter
    .allowRequests(1)
    .every("5 minutes")
    .usingKey(`user_${ctx.auth.user?.discordUserId ?? "anonymous"}`);
});
