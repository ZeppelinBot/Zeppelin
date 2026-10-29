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

export const dataDownloadThrottle = limiter.define("dataDownload", (ctx) => {
  return limiter
    .allowRequests(1)
    .every("5 minutes")
    .usingKey(`user_${ctx.auth.user?.id ?? "anonymous"}`);
});

export const dataDeleteThrottle = limiter.define("dataDelete", (ctx) => {
  return limiter
    .allowRequests(1)
    .every("5 minutes")
    .usingKey(`user_${ctx.auth.user?.id ?? "anonymous"}`);
});
