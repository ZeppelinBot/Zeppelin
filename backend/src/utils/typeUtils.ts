// From https://stackoverflow.com/a/56370310/316944
export type Tail<T extends any[]> = ((...t: T) => void) extends (h: any, ...r: infer R) => void ? R : never;

export declare type WithRequiredProps<T, K extends keyof T> = T & {
  // https://mariusschulz.com/blog/mapped-type-modifiers-in-typescript#removing-the-mapped-type-modifier
  [PK in K]-?: Exclude<T[K], null>;
};
