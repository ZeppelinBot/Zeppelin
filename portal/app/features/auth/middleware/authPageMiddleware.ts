import { HttpContext } from "@adonisjs/core/http";
import { NextFn } from "@adonisjs/core/types/http";

export class AuthPageMiddleware {
  async handle({ auth, inertia, request, response, session }: HttpContext, next: NextFn) {
    if (await auth.check()) {
      return next();
    }

    if (request.method() !== "GET" || request.accepts(["html", "json"]) === "json") {
      return response.unauthorized({
        message: "Authentication required",
      });
    }

    session.setIntendedUrl(request.url());

    return response.send(await inertia.render("features/auth/pages/LoginRequiredPage", {}));
  }
}

export default AuthPageMiddleware;
