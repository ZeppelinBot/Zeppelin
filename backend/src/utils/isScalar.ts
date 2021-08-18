export function isScalar(value: unknown): value is string | number | boolean | null | undefined {
  return value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
