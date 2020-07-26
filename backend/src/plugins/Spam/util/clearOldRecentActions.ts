const MAX_INTERVAL = 300;

export function clearOldRecentActions(pluginData) {
  // TODO: Figure out expiry time from longest interval in the config?
  const expiryTimestamp = Date.now() - 1000 * MAX_INTERVAL;
  pluginData.state.recentActions = pluginData.state.recentActions.filter(action => action.timestamp >= expiryTimestamp);
}
