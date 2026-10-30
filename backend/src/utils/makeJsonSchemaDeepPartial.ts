export function makeJsonSchemaDeepPartial(schema: Record<string, any>) {
  if (schema.type === "object") {
    delete schema.required;
  }
  for (const value of Object.values(schema)) {
    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === "object") {
            makeJsonSchemaDeepPartial(item);
          }
        }
      } else {
        makeJsonSchemaDeepPartial(value);
      }
    }
  }
}
