import { validateTreeDefinition } from './preset-engine-model.js';

export function mapClassCardsToNodes(cards) {
  if (!Array.isArray(cards)) throw new TypeError('Class cards must be an array.');
  return cards.map((card, index) => {
    if (!card || typeof card !== 'object') {
      throw new TypeError(`Class card at index ${index} must be an object.`);
    }
    const id = String(card.id || card.classId || `card-${index + 1}`);
    const cost = Number(card.cost);
    return {
      id,
      name: String(card.name || id),
      cost: Number.isFinite(cost) && cost >= 0 ? cost : 0,
      maxPoints: Number(card.maxPoints) >= 1 ? Number(card.maxPoints) : 1,
      requirements: Array.isArray(card.requirements) ? card.requirements.map(String) : [],
    };
  });
}

export function createClassCardPresetTree(input = {}) {
  if (!input || typeof input !== 'object') throw new TypeError('Class-card preset tree requires input.');
  const treeId = String(input.treeId || '');
  if (!treeId) throw new TypeError('Class-card preset tree requires a treeId.');
  const cards = mapClassCardsToNodes(input.cards);
  if (!cards.length) throw new TypeError('Class-card preset tree requires at least one card.');
  return validateTreeDefinition({
    treeId,
    name: String(input.name || treeId),
    pointsPool: Number(input.pointsPool) >= 0 ? Number(input.pointsPool) : cards.reduce((sum, card) => sum + card.cost * card.maxPoints, 0),
    nodes: cards,
    checkpoints: Array.isArray(input.checkpoints) ? input.checkpoints : [],
  });
}
