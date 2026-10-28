import { HttpContext } from "@adonisjs/core/http";
import { NextFn } from "@adonisjs/core/types/http";

export class AuthPageMiddleware {
  async handle({ auth, inertia, request, response, session }: HttpContext, next: NextFn) {
    if (await auth.check()) {
      return next();
    }

    if (request.method() !== "GET") {
      return response.unauthorized({
        message: "Authentication required"
      });
    }

    session.setIntendedUrl(request.url());

    return inertia.render("features/auth/pages/LoginRequiredPage", {});
  }
}

export default AuthPageMiddleware;
