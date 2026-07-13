import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

const ART_STATES = Object.freeze(['idle', 'active', 'max']);
const NODE_REF_SEPARATOR = '/';
const PERSISTED_KEY_SEPARATOR = ':';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseNodeRef(reference) {
  if (!isNonEmptyString(reference)) return null;
  const firstSeparator = reference.indexOf(NODE_REF_SEPARATOR);
  if (firstSeparator <= 0 || firstSeparator !== reference.lastIndexOf(NODE_REF_SEPARATOR)) {
    return null;
  }
  const treeId = reference.slice(0, firstSeparator);
  const nodeId = reference.slice(firstSeparator + 1);
  return treeId && nodeId ? { treeId, nodeId } : null;
}

function readImageDimensions(filePath) {
  const bytes = readFileSync(filePath);

  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes.toString('ascii', 1, 4) === 'PNG') {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }

  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;

  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda || offset + 1 >= bytes.length) break;

    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return {
        width: bytes.readUInt16BE(offset + 5),
        height: bytes.readUInt16BE(offset + 3),
      };
    }
    offset += segmentLength;
  }

  return null;
}

function validateRect(rect, bounds, label, issues) {
  if (!Array.isArray(rect) || rect.length !== 4 || !rect.every(Number.isFinite)) {
    issues.push(`${label} rect must be four finite numbers.`);
    return;
  }
  const [x, y, width, height] = rect;
  if (x < 0 || y < 0 || width <= 0 || height <= 0) {
    issues.push(`${label} rect must have a non-negative origin and positive size.`);
    return;
  }
  if (x + width > bounds.width || y + height > bounds.height) {
    issues.push(
      `${label} rect ${rect.join(',')} exceeds ${bounds.width}x${bounds.height} source bounds.`
    );
  }
}

function resolveSource(source, repoRoot, label, issues) {
  if (!isNonEmptyString(source) || isAbsolute(source)) {
    issues.push(`${label} source must be a repository-relative path.`);
    return null;
  }
  const absolutePath = resolve(repoRoot, source);
  const pathFromRoot = relative(repoRoot, absolutePath);
  if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
    issues.push(`${label} source escapes the repository root: ${source}.`);
    return null;
  }
  if (!existsSync(absolutePath)) {
    issues.push(`${label} source does not exist: ${source}.`);
    return null;
  }
  return absolutePath;
}

function validateArtVariant(variant, expectedPalette, expectedState, label, context) {
  const { issues, repoRoot, imageDimensions } = context;
  if (!isRecord(variant)) {
    issues.push(`${label} must be an object.`);
    return;
  }
  if (!isNonEmptyString(variant.palette)) {
    issues.push(`${label} palette must be a non-empty string.`);
  } else if (variant.palette !== expectedPalette) {
    issues.push(`${label} palette is ${variant.palette}; expected ${expectedPalette}.`);
  }
  if (variant.observedState !== expectedState) {
    issues.push(`${label} observedState is ${variant.observedState}; expected ${expectedState}.`);
  }
  if (!ART_STATES.includes(expectedState)) {
    issues.push(`${label} uses unsupported state ${expectedState}.`);
  }
  if (
    !Array.isArray(variant.sourceDimensions) ||
    variant.sourceDimensions.length !== 2 ||
    !variant.sourceDimensions.every((value) => Number.isInteger(value) && value > 0)
  ) {
    issues.push(`${label} sourceDimensions must contain two positive integers.`);
    return;
  }

  const [declaredWidth, declaredHeight] = variant.sourceDimensions;
  validateRect(variant.rect, { width: declaredWidth, height: declaredHeight }, label, issues);

  const absolutePath = resolveSource(variant.source, repoRoot, label, issues);
  if (!absolutePath) return;
  let actualDimensions = imageDimensions.get(absolutePath);
  if (!actualDimensions) {
    actualDimensions = readImageDimensions(absolutePath);
    imageDimensions.set(absolutePath, actualDimensions);
  }
  if (!actualDimensions) {
    issues.push(`${label} source dimensions could not be read: ${variant.source}.`);
    return;
  }
  if (actualDimensions.width !== declaredWidth || actualDimensions.height !== declaredHeight) {
    issues.push(
      `${label} declares ${declaredWidth}x${declaredHeight}, but ${variant.source} is ` +
        `${actualDimensions.width}x${actualDimensions.height}.`
    );
  }
  validateRect(variant.rect, actualDimensions, `${label} actual-source`, issues);
}

function buildTechCatalog(techDatabase, issues) {
  const trees = new Map();
  for (const [treeIndex, tree] of (techDatabase || []).entries()) {
    const label = `techDatabase[${treeIndex}]`;
    if (!isNonEmptyString(tree?.id)) {
      issues.push(`${label} must have a stable id.`);
      continue;
    }
    if (tree.id.includes(PERSISTED_KEY_SEPARATOR) || tree.id.includes(NODE_REF_SEPARATOR)) {
      issues.push(`${tree.id} contains a reserved research id separator.`);
    }
    if (trees.has(tree.id)) {
      issues.push(`Duplicate research tree id: ${tree.id}.`);
      continue;
    }

    const nodes = new Map();
    for (const [nodeIndex, node] of (tree.nodes || []).entries()) {
      if (!isNonEmptyString(node?.id)) {
        issues.push(`${tree.id}.nodes[${nodeIndex}] must have a stable id.`);
        continue;
      }
      if (node.id.includes(PERSISTED_KEY_SEPARATOR) || node.id.includes(NODE_REF_SEPARATOR)) {
        issues.push(`${tree.id}/${node.id} contains a reserved research id separator.`);
      }
      if (nodes.has(node.id)) {
        issues.push(`Duplicate node id in ${tree.id}: ${node.id}.`);
      } else {
        nodes.set(node.id, node);
      }
    }
    trees.set(tree.id, { tree, nodes });
  }
  return trees;
}

function validateEdges(treeId, edges, validNodeIds, issues) {
  if (edges === undefined) return;
  if (!Array.isArray(edges)) {
    issues.push(`${treeId}.edges must be an array.`);
    return;
  }

  const nodeIds = new Set(validNodeIds);
  const adjacency = new Map([...nodeIds].map((nodeId) => [nodeId, []]));
  const inDegree = new Map([...nodeIds].map((nodeId) => [nodeId, 0]));
  const seenEdges = new Set();

  for (const [edgeIndex, edge] of edges.entries()) {
    const label = `${treeId}.edges[${edgeIndex}]`;
    if (!Array.isArray(edge) || edge.length !== 2 || !edge.every(isNonEmptyString)) {
      issues.push(`${label} must be a [fromNodeId, toNodeId] pair.`);
      continue;
    }
    const [from, to] = edge;
    if (!nodeIds.has(from) || !nodeIds.has(to)) {
      issues.push(`${label} references an unknown node: ${from} -> ${to}.`);
      continue;
    }
    if (from === to) {
      issues.push(`${label} cannot be a self-edge.`);
      continue;
    }
    const edgeKey = `${from}\u0000${to}`;
    if (seenEdges.has(edgeKey)) {
      issues.push(`${label} duplicates ${from} -> ${to}.`);
      continue;
    }
    seenEdges.add(edgeKey);
    adjacency.get(from).push(to);
    inDegree.set(to, inDegree.get(to) + 1);
  }

  const queue = [...nodeIds].filter((nodeId) => inDegree.get(nodeId) === 0);
  let visitedCount = 0;
  while (queue.length) {
    const nodeId = queue.shift();
    visitedCount += 1;
    for (const nextNode of adjacency.get(nodeId)) {
      inDegree.set(nextNode, inDegree.get(nextNode) - 1);
      if (inDegree.get(nextNode) === 0) queue.push(nextNode);
    }
  }
  if (visitedCount !== nodeIds.size) {
    issues.push(`${treeId}.edges contain a directed cycle.`);
  }
}

function validateLayouts(layouts, trees, issues) {
  const layoutTreeIds = new Set();
  for (const [treeId, layout] of Object.entries(layouts || {})) {
    layoutTreeIds.add(treeId);
    const catalogTree = trees.get(treeId);
    if (!catalogTree) {
      issues.push(`Research layout references unknown tree ${treeId}.`);
      continue;
    }
    if (!isRecord(layout)) {
      issues.push(`${treeId} layout must be an object.`);
      continue;
    }
    if (!isNonEmptyString(layout.theme)) {
      issues.push(`${treeId}.theme must be a non-empty string.`);
    }
    if (!Array.isArray(layout.sections) || layout.sections.length === 0) {
      issues.push(`${treeId}.sections must be a non-empty array.`);
      continue;
    }

    const seenSectionIds = new Set();
    const placedNodes = new Set();
    for (const [sectionIndex, section] of layout.sections.entries()) {
      const sectionLabel = `${treeId}.sections[${sectionIndex}]`;
      if (!isRecord(section)) {
        issues.push(`${sectionLabel} must be an object.`);
        continue;
      }
      if (!isNonEmptyString(section.id)) {
        issues.push(`${sectionLabel}.id must be a non-empty string.`);
      } else if (seenSectionIds.has(section.id)) {
        issues.push(`${treeId} duplicates section id ${section.id}.`);
      } else {
        seenSectionIds.add(section.id);
      }
      if (!isNonEmptyString(section.label) && !isNonEmptyString(section.labelKey)) {
        issues.push(`${sectionLabel} must define a non-empty label or labelKey.`);
      }
      if (!Array.isArray(section.rows) || section.rows.length === 0) {
        issues.push(`${sectionLabel}.rows must be a non-empty array.`);
        continue;
      }

      for (const [rowIndex, row] of section.rows.entries()) {
        const rowLabel = `${sectionLabel}.rows[${rowIndex}]`;
        if (!isRecord(row) || !Array.isArray(row.nodes) || row.nodes.length === 0) {
          issues.push(`${rowLabel}.nodes must be a non-empty array.`);
          continue;
        }
        if (row.nodes.length > 3 || !row.nodes.every(isNonEmptyString)) {
          issues.push(`${rowLabel}.nodes must contain one to three stable node ids.`);
        }
        if (!Array.isArray(row.columns) || row.columns.length !== row.nodes.length) {
          issues.push(`${rowLabel}.columns must match the node count.`);
        } else {
          const uniqueColumns = new Set(row.columns);
          if (
            uniqueColumns.size !== row.columns.length ||
            !row.columns.every((column) => Number.isInteger(column) && column >= 1 && column <= 3)
          ) {
            issues.push(`${rowLabel}.columns must be unique integers from 1 through 3.`);
          }
        }

        for (const nodeId of row.nodes) {
          if (!catalogTree.nodes.has(nodeId)) {
            issues.push(`${rowLabel} references unknown node ${nodeId}.`);
          }
          if (placedNodes.has(nodeId)) {
            issues.push(`${treeId} layout places ${nodeId} more than once.`);
          }
          placedNodes.add(nodeId);
        }
      }
    }

    for (const nodeId of catalogTree.nodes.keys()) {
      if (!placedNodes.has(nodeId)) issues.push(`${treeId} layout omits ${nodeId}.`);
    }
    validateEdges(treeId, layout.edges, catalogTree.nodes.keys(), issues);
  }
  return layoutTreeIds;
}

function validateArt(art, frameAtlas, artGaps, helpers, trees, layoutTreeIds, repoRoot, issues) {
  const imageDimensions = new Map();
  const artNodeRefs = new Set();
  const context = { issues, repoRoot, imageDimensions };

  for (const [reference, entry] of Object.entries(art || {})) {
    const parsed = parseNodeRef(reference);
    if (!parsed) {
      issues.push(`Research art key must use treeId/nodeId: ${reference}.`);
      continue;
    }
    const { treeId, nodeId } = parsed;
    const catalogTree = trees.get(treeId);
    if (!catalogTree?.nodes.has(nodeId)) {
      issues.push(`Research art references unknown stable id ${reference}.`);
      continue;
    }
    if (!layoutTreeIds.has(treeId)) {
      issues.push(`Research art ${reference} belongs to a tree without a declared game layout.`);
    }
    artNodeRefs.add(reference);
    if (!isRecord(entry) || !isRecord(entry.variants) || !Object.keys(entry.variants).length) {
      issues.push(`${reference} art must declare at least one exact variant.`);
      continue;
    }
    const states = Object.keys(entry.variants);
    if (!states.includes(entry.defaultState)) {
      issues.push(`${reference} defaultState does not reference an exact variant.`);
    }
    if (
      !Array.isArray(entry.availableStates) ||
      entry.availableStates.length !== states.length ||
      states.some((state) => !entry.availableStates.includes(state))
    ) {
      issues.push(`${reference} availableStates must exactly match its variants.`);
    }
    for (const [state, variant] of Object.entries(entry.variants)) {
      validateArtVariant(variant, variant?.palette, state, `${reference}.${state}`, context);
      if (helpers?.getResearchNodeArt?.(treeId, nodeId, state) !== variant) {
        issues.push(`${reference} helper does not return its exact ${state} variant.`);
      }
    }
    if (helpers?.getResearchNodeArt?.(treeId, nodeId) !== entry.variants[entry.defaultState]) {
      issues.push(`${reference} helper does not return its declared defaultState.`);
    }
    for (const state of ART_STATES) {
      if (
        !states.includes(state) &&
        helpers?.getResearchNodeArt?.(treeId, nodeId, state) !== null
      ) {
        issues.push(`${reference} helper synthesizes missing preferred state ${state}.`);
      }
    }
    if (helpers?.getResearchNodeArt?.(treeId, nodeId, '__missing_state__') !== null) {
      issues.push(`${reference} helper falls back for an unknown preferred state.`);
    }
  }

  for (const [palette, family] of Object.entries(frameAtlas || {})) {
    if (!isRecord(family) || !Object.keys(family).length) {
      issues.push(`Research frame family ${palette} must declare at least one state.`);
      continue;
    }
    for (const [state, frame] of Object.entries(family)) {
      validateArtVariant(frame, palette, state, `frame.${palette}.${state}`, context);
      if (helpers?.getResearchFrameArt?.(palette, state) !== frame) {
        issues.push(`Frame helper does not return exact ${palette}/${state} art.`);
      }
      if (Array.isArray(frame.rect)) {
        const frameBounds = { width: frame.rect[2], height: frame.rect[3] };
        validateRect(frame.panelSlot, frameBounds, `frame.${palette}.${state}.panelSlot`, issues);
        validateRect(frame.badgeSlot, frameBounds, `frame.${palette}.${state}.badgeSlot`, issues);
      }
    }
    if (helpers?.getResearchFrameArt?.(palette, '__missing_state__') !== null) {
      issues.push(
        `Frame helper falls back for missing preferred state ${palette}/__missing_state__.`
      );
    }
  }
  if (helpers?.getResearchNodeArt?.('__missing_tree__', '__missing_node__', 'idle') !== null) {
    issues.push('Node art helper must return null for unknown stable ids.');
  }
  if (helpers?.getResearchFrameArt?.('__missing_palette__', 'idle') !== null) {
    issues.push('Frame art helper must return null for an unknown palette.');
  }

  const absentTreeIds = new Set();
  for (const [index, gap] of (artGaps?.absentTrees || []).entries()) {
    const label = `artGaps.absentTrees[${index}]`;
    if (!isRecord(gap) || !isNonEmptyString(gap.treeId)) {
      issues.push(`${label} must declare a stable treeId.`);
      continue;
    }
    const catalogTree = trees.get(gap.treeId);
    if (!catalogTree) {
      issues.push(`${label} references unknown tree ${gap.treeId}.`);
      continue;
    }
    if (absentTreeIds.has(gap.treeId)) issues.push(`${label} duplicates ${gap.treeId}.`);
    absentTreeIds.add(gap.treeId);
    if (gap.name !== catalogTree.tree.name) {
      issues.push(`${label} name does not match ${catalogTree.tree.name}.`);
    }
    if (layoutTreeIds.has(gap.treeId)) {
      issues.push(`${label} cannot also have a screenshot-backed layout.`);
    }
    if ([...artNodeRefs].some((reference) => reference.startsWith(`${gap.treeId}/`))) {
      issues.push(`${label} cannot also have exact node art.`);
    }
  }

  const missingNodeRefs = new Set();
  for (const [index, reference] of (artGaps?.missingNodes || []).entries()) {
    const label = `artGaps.missingNodes[${index}]`;
    const parsed = parseNodeRef(reference);
    if (!parsed || !trees.get(parsed.treeId)?.nodes.has(parsed.nodeId)) {
      issues.push(`${label} references unknown stable id ${reference}.`);
      continue;
    }
    if (!layoutTreeIds.has(parsed.treeId)) {
      issues.push(`${label} belongs to a tree without a screenshot-backed layout.`);
    }
    if (missingNodeRefs.has(reference)) issues.push(`${label} duplicates ${reference}.`);
    missingNodeRefs.add(reference);
    if (artNodeRefs.has(reference)) {
      issues.push(`${label} is declared missing but also has exact art.`);
    }
  }

  const contaminatedNodeRefs = new Set();
  for (const [index, reference] of (artGaps?.contaminatedNodes || []).entries()) {
    const label = `artGaps.contaminatedNodes[${index}]`;
    if (contaminatedNodeRefs.has(reference)) issues.push(`${label} duplicates ${reference}.`);
    contaminatedNodeRefs.add(reference);
    if (!missingNodeRefs.has(reference)) {
      issues.push(`${label} must also be declared in missingNodes: ${reference}.`);
    }
  }

  for (const [treeId, catalogTree] of trees) {
    if (!layoutTreeIds.has(treeId) && !absentTreeIds.has(treeId)) {
      issues.push(
        `${treeId} has neither a screenshot-backed layout nor an explicit absent-tree gap.`
      );
    }
    if (!layoutTreeIds.has(treeId)) continue;
    for (const nodeId of catalogTree.nodes.keys()) {
      const reference = `${treeId}/${nodeId}`;
      if (!artNodeRefs.has(reference) && !missingNodeRefs.has(reference)) {
        issues.push(`${reference} has neither exact art nor an explicit missing-node gap.`);
      }
    }
  }

  return {
    artNodeCount: artNodeRefs.size,
    absentTreeCount: absentTreeIds.size,
    missingNodeCount: missingNodeRefs.size,
    sourceFileCount: imageDimensions.size,
  };
}

function validatePersistenceSource(persistenceSource, issues) {
  if (!isNonEmptyString(persistenceSource)) {
    issues.push('Research persistence source was not supplied for static validation.');
    return;
  }
  const progressIdFunction =
    /function\s+researchProgressId\s*\(\s*techId\s*,\s*nodeId\s*\)\s*\{[\s\S]*?return\s+`\$\{techId\}:\$\{nodeId\}`\s*;?[\s\S]*?\}/;
  if (!progressIdFunction.test(persistenceSource)) {
    issues.push('Research persistence key must remain `${techId}:${nodeId}`.');
  }
  const progressIdReferences =
    persistenceSource.match(/\bresearchProgressId\s*\(\s*techId\s*,\s*nodeId\s*\)/g) || [];
  if (progressIdReferences.length < 3) {
    issues.push('Research persistence getter and setter must both use researchProgressId().');
  }
  if (!/const\s+RESEARCH_PROGRESS_KEY\s*=\s*['"]vts_research_v1['"]/.test(persistenceSource)) {
    issues.push('Research progress storage namespace must remain vts_research_v1.');
  }
}

export function validateResearchContracts({
  techDatabase,
  layouts,
  art,
  frameAtlas,
  artGaps,
  getResearchNodeArt,
  getResearchFrameArt,
  persistenceSource,
  repoRoot = process.cwd(),
}) {
  const issues = [];
  const trees = buildTechCatalog(techDatabase, issues);
  const layoutTreeIds = validateLayouts(layouts, trees, issues);
  const artStats = validateArt(
    art,
    frameAtlas,
    artGaps,
    { getResearchNodeArt, getResearchFrameArt },
    trees,
    layoutTreeIds,
    repoRoot,
    issues
  );
  validatePersistenceSource(persistenceSource, issues);

  return {
    issues,
    stats: {
      treeCount: trees.size,
      nodeCount: [...trees.values()].reduce((sum, entry) => sum + entry.nodes.size, 0),
      layoutTreeCount: layoutTreeIds.size,
      ...artStats,
    },
  };
}
