/**
 * Zeppelin staff have full access to the dashboard
 */
export function isStaff(userId: string) {
  return (process.env.STAFF ?? "").split(",").includes(userId);
}
