/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file is used to register the middleware with the server
| or the router.
|
*/

import router from "@adonisjs/core/services/router";
import server from "@adonisjs/core/services/server";

server.errorHandler(() => import("#backend/exceptions/handler"));

server.use([
  () => import("#backend/middleware/containerBindingsMiddleware"),
  () => import("@adonisjs/static/static_middleware"),
  () => import("@adonisjs/cors/cors_middleware"),
  () => import("@adonisjs/vite/vite_middleware"),
  () => import("#backend/middleware/inertiaMiddleware"),
]);

router.use([
  () => import("@adonisjs/core/bodyparser_middleware"),
  () => import("@adonisjs/session/session_middleware"),
  () => import("@adonisjs/shield/shield_middleware"),
  () => import("@adonisjs/auth/initialize_auth_middleware"),
  () => import("#backend/middleware/silentAuthMiddleware"),
]);

export const middleware = router.named({
  guest: () => import("#backend/middleware/guestMiddleware"),
  auth: () => import("#backend/middleware/authMiddleware"),
  authPage: () => import("#backend/features/auth/middleware/authPageMiddleware"),
  isStaff: () => import("#backend/middleware/isStaffMiddleware"),
});
