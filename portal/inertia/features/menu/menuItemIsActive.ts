import { MenuItem } from "#backend/features/menu/types";

const normalize = (path: string) => path.replace(/\/$/, "").toLowerCase();

export function menuItemIsActive(item: MenuItem, currentPath: string) {
  const normalizedCurrentPath = normalize(currentPath);
  const normalizedItemPath = normalize(item.path);
  return item.activeStartsWith ? normalizedCurrentPath.startsWith(normalizedItemPath) : normalizedCurrentPath === normalizedItemPath;
}
