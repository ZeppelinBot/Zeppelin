export function stripMarkdown(str) {
  return str.replace(/[*_|~`]/g, "");
}
