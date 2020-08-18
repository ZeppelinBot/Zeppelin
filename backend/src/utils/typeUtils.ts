// From https://stackoverflow.com/a/56370310/316944
export type Tail<T extends any[]> = ((...t: T) => void) extends (h: any, ...r: infer R) => void ? R : never;
