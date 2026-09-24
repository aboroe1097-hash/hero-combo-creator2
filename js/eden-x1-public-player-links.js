const PUBLIC_PLAYER_CONTAINER_IDS = [
  'dashWeightedContributionPanel',
  'edenX1PublicOverview',
  'edenX1PublicDashboard',
];

export function bindPublicPlayerLinks(documentRef, onOpenPlayer) {
  if (!documentRef || typeof documentRef.getElementById !== 'function') return;
  if (typeof onOpenPlayer !== 'function') return;

  PUBLIC_PLAYER_CONTAINER_IDS.forEach((id) => {
    const root = documentRef.getElementById(id);
    if (!root || root.dataset.publicPlayerLinksBound) return;

    root.dataset.publicPlayerLinksBound = '1';
    root.addEventListener('click', (event) => {
      const playerButton = event.target?.closest?.('[data-public-player]');
      if (!playerButton || !root.contains(playerButton)) return;

      const playerKey = playerButton.getAttribute('data-public-player');
      if (playerKey) onOpenPlayer(playerKey);
    });
  });
}
