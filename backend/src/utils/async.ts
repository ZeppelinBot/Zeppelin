import { Awaitable } from "./typeUtils";

export async function asyncReduce<T, V>(
  arr: T[],
  callback: (accumulator: V, currentValue: T, index: number, array: T[]) => Awaitable<V>,
  initialValue?: V,
): Promise<V> {
  let accumulator;
  let arrayToIterate;
  if (initialValue !== undefined) {
    accumulator = initialValue;
    arrayToIterate = arr;
  } else {
    accumulator = arr[0];
    arrayToIterate = arr.slice(1);
  }

  for (const [i, currentValue] of arr.entries()) {
    accumulator = await callback(accumulator, currentValue, i, arr);
  }

  return accumulator;
}

export function asyncFilter<T>(
  arr: T[],
  callback: (element: T, index: number, array: T[]) => Awaitable<boolean>,
): Promise<T[]> {
  return asyncReduce<T, T[]>(
    arr,
    async (newArray, element, i, _arr) => {
      if (await callback(element, i, _arr)) {
        newArray.push(element);
      }

      return newArray;
    },
    [],
  );
}

export function asyncMap<T, V>(
  arr: T[],
  callback: (currentValue: T, index: number, array: T[]) => Awaitable<V>,
): Promise<V[]> {
  return asyncReduce<T, V[]>(
    arr,
    async (newArray, element, i, _arr) => {
      newArray.push(await callback(element, i, _arr));
      return newArray;
    },
    [],
  );
}
