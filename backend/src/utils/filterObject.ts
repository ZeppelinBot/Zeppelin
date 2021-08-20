/**
 * Filter an object's properties based on its values and keys
 * @return New object with filtered properties
 */
export function filterObject<T extends Record<string | number | symbol, unknown>>(
  object: T,
  filterFn: <K extends keyof T>(value: T[K], key: K) => boolean,
): Record<keyof T, T[keyof T]> {
  return Object.fromEntries(Object.entries(object).filter(([key, value]) => filterFn(value as any, key))) as Record<
    keyof T,
    T[keyof T]
  >;
}
