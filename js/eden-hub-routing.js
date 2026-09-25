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

/**
 * `#edenHub?subtab=<unknown>` (a typo or a sub-tab that no longer exists)
 * opens the hub's default landing page, so the address bar should say so too:
 * replace the hash with the canonical `#edenHub`. Known sub-tabs and other
 * routes are left alone. Returns true when the hash was replaced.
 */
export function normalizeUnknownEdenHubSubtab(hash, knownSubtabs, history) {
  const text = String(hash || '').replace(/^#/, '');
  const [route, query = ''] = text.split('?');
  if (route.toLowerCase() !== 'edenhub') return false;
  const params = new URLSearchParams(query);
  if (!params.has('subtab')) return false;
  if (knownSubtabs.includes(params.get('subtab'))) return false;
  history.replaceState(history.state, '', '#edenHub');
  return true;
}
