const scalarTypes = ["string", "number", "boolean", "bigint"];

export class ObjectAliasError extends Error {}

/**
 * Removes object aliases/anchors from a loaded YAML object
 */
export function validateNoObjectAliases<T extends object>(obj: T, seen?: WeakSet<any>): void {
  if (!seen) {
    seen = new WeakSet();
  }

  for (const [, value] of Object.entries(obj)) {
    if (value == null || scalarTypes.includes(typeof value)) {
      continue;
    }

    if (seen.has(value)) {
      throw new ObjectAliasError("Object aliases are not allowed");
    }

    validateNoObjectAliases(value, seen);
    seen.add(value);
  }
}
