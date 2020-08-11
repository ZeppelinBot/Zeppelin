export function intToRgb(int: number): [number, number, number] {
  const r = int >> 16;
  const g = (int - (r << 16)) >> 8;
  const b = int - (r << 16) - (g << 8);
  return [r, g, b];
}
