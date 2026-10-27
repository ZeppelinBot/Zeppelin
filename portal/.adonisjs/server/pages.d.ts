import '@adonisjs/inertia/types'


        import type {
          VNodeProps,
          AllowedComponentProps,
          ComponentInstance
        } from 'vue'

        type ExtractProps<T> = Omit<
          ComponentInstance<T>['$props'],
          keyof VNodeProps | keyof AllowedComponentProps
        >
      

declare module '@adonisjs/inertia/types' {

  export interface InertiaPages {

    'features/docs/pages/DocsIndex': ExtractProps<(typeof import('../../inertia/features/docs/pages/DocsIndex.vue'))['default']>

    'features/errors/pages/NotFound': ExtractProps<(typeof import('../../inertia/features/errors/pages/NotFound.vue'))['default']>

    'features/errors/pages/ServerError': ExtractProps<(typeof import('../../inertia/features/errors/pages/ServerError.vue'))['default']>

    'features/splash/pages/SplashIndex': ExtractProps<(typeof import('../../inertia/features/splash/pages/SplashIndex.vue'))['default']>

  }

}

