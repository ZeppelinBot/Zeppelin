import type { HttpContext } from "@adonisjs/core/http";

export default class SplashController {
  async getIndex({ inertia }: HttpContext) {
    return inertia.render("features/splash/pages/SplashIndex", { example: "hi" });
  }
}
