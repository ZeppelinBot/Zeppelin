// https://rosettacode.org/wiki/Levenshtein_distance#JavaScript

function levenshtein(a: string, b: string): number {
  let t: number[] = [];
  let u: number[] = [];
  const m = a.length;
  const n = b.length;
  if (!m) {
    return n;
  }
  if (!n) {
    return m;
  }
  for (let j = 0; j <= n; j++) {
    t[j] = j;
  }
  for (let i = 1; i <= m; i++) {
    let j: number;
    // tslint:disable-next-line:ban-comma-operator
    for (u = [i], j = 1; j <= n; j++) {
      u[j] = a[i - 1] === b[j - 1] ? t[j - 1] : Math.min(t[j - 1], t[j], u[j - 1]) + 1;
    }
    t = u;
  }
  return u[n];
}

export function distance(str: string, t: string): number {
  return levenshtein(str, t);
}
