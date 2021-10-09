type Categories<T> = {
  [key: string]: (item: T) => boolean;
};

type CategoryReturnType<T, C extends Categories<T>> = {
  [key in keyof C]: T[];
};

function initCategories<T extends unknown, C extends Categories<T>>(categories: C): CategoryReturnType<T, C> {
  return Object.keys(categories).reduce((map, key) => {
    map[key] = [];
    return map;
  }, {}) as CategoryReturnType<T, C>;
}

export function categorize<T extends unknown, C extends Categories<T>>(
  arr: T[],
  categories: C,
): CategoryReturnType<T, C> {
  const result = initCategories<T, C>(categories);
  const categoryEntries = Object.entries(categories);

  itemLoop: for (const item of arr) {
    for (const [category, fn] of categoryEntries) {
      if (fn(item)) {
        result[category].push(item);
        continue itemLoop;
      }
    }
  }

  return result;
}
