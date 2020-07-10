export async function removeUserIdFromActiveAlerts(pluginData, userId: string) {
  const index = pluginData.state.usersWithAlerts.indexOf(userId);
  if (index > -1) {
    pluginData.state.usersWithAlerts.splice(index, 1);
  }
}
