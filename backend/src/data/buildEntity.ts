export function buildEntity<T extends object>(Entity: new () => T, data: Partial<T>): T {
  const instance = new Entity();
  for (const [key, value] of Object.entries(data)) {
    instance[key] = value;
  }
  return instance;
}
