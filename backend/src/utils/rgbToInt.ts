export function rgbToInt(rgb: [number, number, number]) {
  return (rgb[0] << 16) + (rgb[1] << 8) + rgb[2];
}
