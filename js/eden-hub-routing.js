export function resolveEdenHubInitialRoute(requested, clicked, history) {
  const isClickedIntent = Boolean(
    requested && requested !== 'season' && requested !== 'vote' && requested === clicked
  );
  if (isClickedIntent) {
    // The click-only subtab query no longer describes the default landing page.
    // Clear it as well as suppressing it so the address bar matches the season
    // panel that opens after publication is checked.
    history.replaceState(history.state, '', '#edenHub');
  }
  return {
    intent: isClickedIntent ? '' : requested,
    useCurrentSeasonDefault: !requested || isClickedIntent,
  };
}
