export function buildCustomId(namespace: string, data: any = {}) {
  return `${namespace}:${Date.now()}:${JSON.stringify(data)}`;
}
