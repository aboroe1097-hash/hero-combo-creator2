import { getPublicVtsPlayerProfile } from '../vts-public-players.js';
import { boundedStringArray, rejectUnknownArguments, requirePlainArguments } from './tool-utils.js';

export async function getVtsPlayerContextAdapter(rawArguments) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['names']);
  const names = boundedStringArray(args.names, 'names', {
    minimum: 1,
    maximum: 20,
    item: { maximum: 80 },
  });
  const players = [];
  const missingNames = [];

  for (const requestedName of names) {
    const publicProfile = getPublicVtsPlayerProfile(requestedName);
    if (!publicProfile) {
      missingNames.push(requestedName);
      continue;
    }
    players.push({ requestedName, ...publicProfile, visibility: 'public_app_label' });
  }

  const warnings = missingNames.length
    ? [
        `No public VTS player label was found for: ${missingNames.join(', ')}. Private rosters and ballots were not searched.`,
      ]
    : [];
  return {
    data: {
      players,
      missingNames,
      privateRosterSearched: false,
      edenBallotsSearched: false,
    },
    meta: {
      sourceId: 'vts-public-player-tags',
      filters: { names },
      truncated: false,
      completeness: warnings.length ? 'partial' : 'complete',
      warnings,
    },
  };
}
