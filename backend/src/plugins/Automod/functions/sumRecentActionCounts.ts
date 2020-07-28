import { RecentAction } from "../types";

export function sumRecentActionCounts(actions: RecentAction[]) {
  return actions.reduce((total, action) => total + action.count, 0);
}
