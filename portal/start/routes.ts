/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

// import { middleware } from '#start/kernel'
import { docsLayoutData } from "#backend/features/docs/utils/docsLayoutData";
import { controllers } from "#generated/controllers";
import router from "@adonisjs/core/services/router";

router.get("/", [controllers.splash.Splash, "getIndex"]);

router.group(() => {
  router.get("/", [controllers.docs.Docs, "getIndex"]);
}).prefix("/docs").use(({ inertia }, next) => {
  inertia.share({
    docsLayoutData,
  });
  return next();
});

// router.on('/').renderInertia('home', {}).as('home')

// router
//   .group(() => {
//     router.get('signup', [controllers.NewAccount, 'create'])
//     router.post('signup', [controllers.NewAccount, 'store'])

//     router.get('login', [controllers.Session, 'create'])
//     router.post('login', [controllers.Session, 'store'])
//   })
//   .use(middleware.guest())

// router
//   .group(() => {
//     router.on('/dashboard').renderInertia('dashboard', {}).as('dashboard')
//     router.post('logout', [controllers.Session, 'destroy'])
//   })
//   .use(middleware.auth())
