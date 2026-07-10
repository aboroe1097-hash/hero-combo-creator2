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

export function applyDashboardAttackMutation(attacks, mutation = {}) {
  const nextAttacks = (Array.isArray(attacks) ? attacks : []).map(cloneDashboardAttack);
  const attackId = String(mutation.attackId || '');
  const index = nextAttacks.findIndex((attack) => String(attack?.id || '') === attackId);

  if (mutation.type === 'delete') {
    if (index === -1) return { attacks: nextAttacks, applied: false, reason: 'missing' };
    nextAttacks.splice(index, 1);
    return { attacks: nextAttacks, applied: true };
  }

  if (mutation.type !== 'edit') {
    return { attacks: nextAttacks, applied: false, reason: 'invalid-mutation' };
  }
  if (index === -1) return { attacks: nextAttacks, applied: false, reason: 'missing' };

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
