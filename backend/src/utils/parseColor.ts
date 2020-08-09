import _parseColor from "parse-color";

// Accepts 100,100,100 and 100 100 100
const isRgb = /^(\d{1,3})\D+(\d{1,3})\D+(\d{1,3})$/;

const isPartialHex = /^([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Parses a color from the input string. The following formats are accepted:
 * - any CSS color format (hex, rgb(), color names, etc.)
 * - rrr, ggg, bbb
 * - rrr ggg bbb
 * @return Parsed color as `[r, g, b]` or `null` if no color could be parsed
 */
export function parseColor(input: string): null | [number, number, number] {
  const rgbMatch = input.match(isRgb);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);

    if (r > 255 || g > 255 || b > 255) {
      return null;
    }

    return [r, g, b];
  }

  if (input.match(isPartialHex)) {
    input = `#${input}`;
  }

  const cssColorMatch = _parseColor(input);
  if (cssColorMatch.rgb) {
    return cssColorMatch.rgb;
  }

  return null;
}
