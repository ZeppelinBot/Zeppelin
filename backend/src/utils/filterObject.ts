type FilterResult<T> = {
  [K in keyof T]?: T[K];
};

/**
 * Filter an object's properties based on its values and keys
 * @return New object with filtered properties
 */
export function filterObject<T extends object>(
  object: T,
  filterFn: <K extends keyof T>(value: T[K], key: K) => boolean,
): FilterResult<T> {
  return Object.fromEntries(
    Object.entries(object).filter(([key, value]) => filterFn(value as any, key as keyof T)),
  ) as FilterResult<T>;
}
