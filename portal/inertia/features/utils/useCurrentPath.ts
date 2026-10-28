import { usePage } from "@inertiajs/vue3";
import { computed } from "vue";

export function useCurrentPath() {
  const page = usePage();
  return computed(() => page.url.split("?")[0]);
}
