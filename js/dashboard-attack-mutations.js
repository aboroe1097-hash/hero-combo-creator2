function cloneDashboardAttack(attack) {
  if (!attack || typeof attack !== 'object') return attack;
  const copy = { ...attack };
  if (Array.isArray(attack.players)) {
    copy.players = attack.players.map((player) =>
      player && typeof player === 'object' ? { ...player } : player
    );
  }
  delete copy._validation;
  return copy;
}

function attackSessionTimestamp(attack) {
  const match = /_(\d{10,})$/.exec(String(attack?.id || ''));
  return match?.[1] || '';
}

function mergeOcrPlayers(currentPlayers = [], incomingPlayers = []) {
  const merged = new Map();
  [...currentPlayers, ...incomingPlayers].forEach((player) => {
    if (!player || typeof player !== 'object') return;
    const name = String(player.name || '').trim();
    const value = Number(player.value || 0);
    if (!name || !Number.isFinite(value) || value <= 0) return;
    const key = `${name.toLowerCase()}\u0000${value}`;
    if (!merged.has(key)) merged.set(key, { ...player, name, value });
  });
  return [...merged.values()]
    .sort((first, second) => Number(second.value || 0) - Number(first.value || 0))
    .map((player, index) => ({ ...player, rank: index + 1 }));
}

/**
 * Merge OCR sessions into the newest cloud attack list. Unlike form edits,
 * uploads are additive and must not fail merely because another admin/device
 * uploaded while OCR was reading screenshots.
 */
export function mergeDashboardOcrAttacks(currentAttacks = [], incomingAttacks = []) {
  const merged = (Array.isArray(currentAttacks) ? currentAttacks : []).map(cloneDashboardAttack);

  (Array.isArray(incomingAttacks) ? incomingAttacks : []).forEach((incomingValue) => {
    const incoming = cloneDashboardAttack(incomingValue);
    if (!incoming || typeof incoming !== 'object' || !incoming.id) return;
    const timestamp = attackSessionTimestamp(incoming);
    const index = merged.findIndex((current) => {
      if (String(current?.id || '') === String(incoming.id)) return true;
      return timestamp && attackSessionTimestamp(current) === timestamp;
    });
    if (index < 0) {
      const players = mergeOcrPlayers([], incoming.players);
      merged.push({
        ...incoming,
        players,
        players_count: players.length,
        total_demolition: players.reduce((sum, player) => sum + Number(player.value || 0), 0),
      });
      return;
    }

    const current = merged[index];
    const players = mergeOcrPlayers(current.players, incoming.players);
    merged[index] = {
      ...current,
      ...incoming,
      players,
      players_count: players.length,
      total_demolition: players.reduce((sum, player) => sum + Number(player.value || 0), 0),
    };
  });

  return merged.sort((first, second) =>
    String(second?.game_time || '').localeCompare(String(first?.game_time || ''))
  );
}

function normalizeFingerprintValue(value) {
  if (Array.isArray(value)) return value.map(normalizeFingerprintValue);
  if (!value || typeof value !== 'object') return value;
  if (typeof value.toMillis === 'function') return { timestampMs: value.toMillis() };

  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => key !== '_validation')
      .sort()
      .map((key) => [key, normalizeFingerprintValue(value[key])])
  );
}

export function dashboardAttackFingerprint(attack) {
  if (!attack || typeof attack !== 'object') return '';
  return JSON.stringify(normalizeFingerprintValue(attack));
}

export function applyDashboardAttackMutation(attacks, mutation = {}) {
  const nextAttacks = (Array.isArray(attacks) ? attacks : []).map(cloneDashboardAttack);
  const attackId = String(mutation.attackId || '');
  const index = nextAttacks.findIndex((attack) => String(attack?.id || '') === attackId);

  if (mutation.type === 'delete') {
    if (index === -1) return { attacks: nextAttacks, applied: false, reason: 'missing' };
    if (
      !mutation.expectedFingerprint ||
      dashboardAttackFingerprint(nextAttacks[index]) !== mutation.expectedFingerprint
    ) {
      return { attacks: nextAttacks, applied: false, reason: 'changed' };
    }
    nextAttacks.splice(index, 1);
    return { attacks: nextAttacks, applied: true };
  }

  if (mutation.type !== 'edit') {
    return { attacks: nextAttacks, applied: false, reason: 'invalid-mutation' };
  }
  if (index === -1) return { attacks: nextAttacks, applied: false, reason: 'missing' };
  if (
    !mutation.expectedFingerprint ||
    dashboardAttackFingerprint(nextAttacks[index]) !== mutation.expectedFingerprint
  ) {
    return { attacks: nextAttacks, applied: false, reason: 'changed' };
  }

  const patch = mutation.patch && typeof mutation.patch === 'object' ? mutation.patch : {};
  const nextAttack = { ...nextAttacks[index], ...cloneDashboardAttack(patch) };
  const nextId = String(nextAttack.id || attackId);
  const collision = nextAttacks.some(
    (attack, attackIndex) => attackIndex !== index && String(attack?.id || '') === nextId
  );
  if (collision) return { attacks: nextAttacks, applied: false, reason: 'id-collision' };

  nextAttack.id = nextId;
  delete nextAttack._validation;
  nextAttacks[index] = nextAttack;
  return { attacks: nextAttacks, applied: true };
}
