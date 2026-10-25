import type { Data } from "#client/data.d.ts";

/**
 * Bridge the shared props and flash data inferred from the Inertia
 * middleware into the Inertia client, so `usePage().props`, `usePage().flash`,
 * and layout callbacks are typed globally without passing a generic at each
 * call site.
 */
declare module "@inertiajs/core" {
  interface InertiaConfig {
    sharedPageProps: Data.SharedProps;
    flashDataType: Data.FlashMessages;
  }
}
