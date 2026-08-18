# Cavalry Topology Analysis — Batch 1

**Analyst:** OpenCode visual review  
**Source:** `C:\Users\alsel\Downloads\WhatsApp Unknown 2026-08-12 at 14.23.40`  
**Scope:** Cavalry column-I researches only  
**Researches:** `training1`, `encounter1`, `callofglory1`, `enhanced1`  
**Status:** Visual analysis handoff for DeepSeek. Do not treat this document as proof of directed unlock order unless explicitly marked `directed`.

## 1. Reading rules

- The gold/white glow is a selected or highlighted node state in these captures. It is not by itself proof that the node is a prerequisite of another node.
- The bright lines prove visible graph arrangement and connection geometry. In completed graphs they do not prove which endpoint unlocks first.
- The center research badge is the research emblem, not an attribute node.
- A larger circular node is a passive/major node when its detail panel identifies a passive skill. It must not be flattened into a normal attribute node.
- Costs shown beside the detail panel are recorded as observed values for that selected node. They are not derived from the whole-research cost.
- Where the bottom of a graph is outside the image, the topology is marked `partial-frame`.

## 2. Batch summary

| Research | Visible attribute nodes | Passive/major node | Frame coverage | Directed prerequisites |
|---|---:|---|---|---|
| Cavalry Training I | 10 | `Faltering` | Complete ring | Not proven |
| Encounter Battle I | 14 | None | Mostly visible, lower edge cropped | Not proven |
| Call of Glory I | 16 | `Restart I` / central passive shown by source corpus | Upper/middle graph visible, lower edge cropped | Not proven |
| Enhanced Tactics I | 23 | `Emergency Rescue I` / lower passive shown by source corpus | Upper/middle graph visible, lower edge cropped | Not proven |

The node counts agree with the existing canonical corpus and Cavalry descriptors. The screenshots add
visual arrangement, exact visible labels/effects, selected-state examples, and observed node costs.

## 3. Cavalry Training I (`training1`)

### 3.1 Visual topology

This is a closed outer ring around the central research emblem:

```text
                         passive Faltering
                    /                         \
          top-left attribute                 top-right attribute
              |                                      |
        left-upper attribute                  right-upper attribute
              |                                      |
        left-lower attribute                  right-middle attribute
              |                                      |
          bottom-left attribute             right-lower attribute
                    \                         /
                    bottom-center attribute
```

The screenshot visually shows the ring continuing from the passive node through the upper-right side
and back through the upper-left side. The exact unlock direction is not proven.

### 3.2 Node identity handoff

The following mapping follows the existing canonical node IDs and the visual clockwise order visible
in the graph. It is suitable for implementation as visual arrangement data, not as prerequisite data.

| Canonical node | Visual position | Icon family | Label / effect |
|---:|---|---|---|
| 1 | upper-left | crossed swords | Courage — Might +1% |
| 2 | left side, upper-middle | green heart | Revival — HP +1% |
| 3 | left side, lower-middle | crossed swords | Courage — Might +1% |
| 4 | lower-left | shield | Defense — Resistance +1% |
| 5 | bottom | crossed swords, major attribute | Frenzy Fighter — Base Might +2% |
| 6 | lower-right | shield | Defense — Resistance +1% |
| 7 | right side, lower-middle | crossed swords | Courage — Might +1% |
| 8 | right side, upper-middle | green heart | Revival — HP +1% |
| 9 | upper-right | shield | Defense — Resistance +1% |
| 10 | top-right, next to passive | green heart | Revival — HP +1% |
| 11 | top | purple hourglass passive | Cavalry `Faltering` |

### 3.3 Selected detail evidence

- `WhatsApp Image 2026-08-12 at 14.22.25.jpeg`: selected `Courage`; panel says `For squads with Cavalry, Might increased by 1%`; observed cost `2400`.
- `WhatsApp Image 2026-08-12 at 14.22.26.jpeg`: selected `Faltering`; panel shows the Cavalry passive text; observed cost `17600`.
- The source corpus supplies the full passive text and confirms the passive node is node 11.

## 4. Encounter Battle I (`encounter1`)

### 4.1 Visual topology

The graph is a branching/diamond structure rather than a simple ring. The top green-heart node is a
shared branch point. Two inner branches descend toward the research emblem. Outer left and right
branches descend around the sides. The lower purple horse/marching node is visible near the bottom.
The frame does not show every lower connection cleanly enough to assert a complete directed graph.

```text
 left outer red      top green heart       right outer shield
       |              /       \                   |
 left red        inner red   inner shield       right shield
       |              \       /                   |
 left special ---- outer lower paths ---- right red/shield
                         |
                   lower marching node
```

### 4.2 Node identity handoff

The canonical corpus identifies 14 attributes. The image set visibly confirms these labels/effects:

| Canonical node | Label | Effect shown/confirmed | Visual family |
|---:|---|---|---|
| 1 | Extermination | Cavalry Resistance in non-siege battles +1% | shield |
| 2 | Raid | Cavalry Might in non-siege battles +1% | crossed swords |
| 3 | Survival in the Wild | Cavalry HP in non-siege battles +6% | green heart, large |
| 4 | Extermination | same +1% non-siege Resistance | shield |
| 5 | Extermination | same +1% non-siege Resistance | shield |
| 6 | Ambush in the Wild | Tactical Might in non-siege battles +1% | special starburst |
| 7 | Extermination | same +1% non-siege Resistance | shield |
| 8 | Extermination | same +1% non-siege Resistance | shield |
| 9 | Raid | same +1% non-siege Might | crossed swords |
| 10 | Raid | same +1% non-siege Might | crossed swords |
| 11 | Field Intel | Tactical Resistance in non-siege battles +1% | special starburst |
| 12 | Raid | same +1% non-siege Might | crossed swords |
| 13 | Raid | same +1% non-siege Might | crossed swords |
| 14 | Marching | Marching Speed +5 | purple horse, lower major node |

### 4.3 Selected detail evidence

- `WhatsApp Image 2026-08-12 at 14.22.27 (1).jpeg`: `Extermination`, Cavalry Resistance in non-siege battles +1%, observed cost `3690`.
- `WhatsApp Image 2026-08-12 at 14.22.27 (2).jpeg`: `Raid`, Cavalry Might in non-siege battles +1%, observed cost `3690`.
- `WhatsApp Image 2026-08-12 at 14.22.29.jpeg`: `Survival in the Wild`, Cavalry HP in non-siege battles +6%, observed cost `13490`.
- `WhatsApp Image 2026-08-12 at 14.22.29 (1).jpeg`: `Movement in Unison`, Cavalry Combat Speed +10, observed cost `23300`. This is a milestone/large bonus detail associated with the completed research view, not one of the 14 ordinary node records in the current canonical list.

The `Movement in Unison` detail is important: preserve it as a separate large/extra bonus record if
the UI source data exposes it. Do not force it into an ordinary attribute node ID without a corpus
mapping.

## 5. Call of Glory I (`callofglory1`)

### 5.1 Visual topology

The graph has a central upper passive/major area, symmetric left/right branches, and lower branches
that continue below the captured frame. The image proves visible connections between the displayed
nodes, but not their directed unlock order.

Visible structure:

```text
                 left major ---- passive/research center ---- right major
                    /   \                                   /   \
              left red nodes                         right red nodes
                      \                                 /
                 lower center research emblem / branches
                    shield branches and lower green nodes
```

### 5.2 Node identity handoff

The canonical 16-node list and image details agree on these groups:

| Canonical nodes | Label | Effect |
|---|---|---|
| 1–3 | Stronghold | Cavalry Resistance +1% in RoC/battlefield context |
| 4 | Revival in Chaos | Cavalry HP +6% in RoC context |
| 5–7 | Unyielding | Cavalry Resistance +3% after entering the battlefield |
| 8 | Battlefield Revival | Cavalry HP +6% after entering the battlefield |
| 9–11 | Charge | Cavalry Might +1% in RoC context |
| 12 | Cooperation | Cavalry Might +1% when joining rally attacks |
| 13–15 | March | Cavalry Might +1% after entering the battlefield |
| 16 | Solidarity | Cavalry Resistance +1% when joining rally attacks |

### 5.3 Selected detail evidence

The image set visibly includes:

- `March` — Cavalry Might +1% after entering the battlefield; observed cost `5160`.
- `Charge` — Cavalry Might +1% in Reign of Chaos seasons; observed cost `5160`.
- `Stronghold` — Cavalry Resistance +1% in Reign of Chaos seasons; observed cost `5160`.
- `Unyielding` — Cavalry Resistance +3% after entering the battlefield; observed cost `5160`.
- `Solidarity` — Cavalry Resistance +1% when joining rally attacks; observed cost `5970`.
- `Cooperation` — Cavalry Might +1% when joining rally attacks; observed cost `5970`.
- `Battlefield Revival` — Cavalry HP +6% after entering the battlefield; observed cost `20700`.
- `Revival in Chaos` — Cavalry HP +6% in Reign of Chaos seasons; observed cost `20700`.

The image set does not provide enough evidence to assign each repeated icon to a directed prerequisite
chain. Keep repeated groups distinct by canonical ID, but leave topology edges arrangement-only.

## 6. Enhanced Tactics I (`enhanced1`)

### 6.1 Visual topology

This is a large branching graph. The research emblem is near the upper center. The visible graph has
left and right upper red-sword branches, shield/helmet branches in the middle, starburst branches
below, a central vertical route, and lower branches continuing below the screenshots. The image set is
not a full frame of all 23 attributes plus the passive node.

```text
 left red branch          research emblem          right red branch
        \                   /   \                   /
       red / defense nodes       red / defense nodes
              \       central helmet route       /
             starburst branches and lower routes
                         |
                    passive/major route
```

### 6.2 Node identity handoff

The canonical 23-node list is confirmed by the visible icon families and selected details:

| Canonical nodes | Label | Effect |
|---|---|---|
| 1–3 | Defense Plan | Cavalry Tactical Might +1% in siege defense |
| 4 | Solidarity | Cavalry Resistance +1% when joining rally attacks |
| 5–7 | Defense Intel | Cavalry Tactical Resistance +1% in siege defense |
| 8–10 | Field Intel | Cavalry Tactical Resistance +1% in non-siege battles |
| 11–13 | Siege Plan | Cavalry Tactical Might +1% in siege attacks |
| 14 | Cooperation | Cavalry Might +1% when joining rally attacks |
| 15–17 | Siege Intel | Cavalry Tactical Resistance +1% in siege attacks |
| 18–20 | Ambush in the Wild | Cavalry Tactical Might +1% in non-siege battles |
| 21 | Revival | Cavalry HP +6% |
| 22 | Solidarity | Cavalry Resistance +1% when joining rally attacks |
| 23 | Cooperation | Cavalry Might +1% when joining rally attacks |
| 24 | passive/major | `Emergency Rescue I` |

### 6.3 Selected detail evidence

- `Defense Plan` — Cavalry Tactical Might +1% in siege defense; observed cost `5700`.
- `Siege Plan` — Cavalry Tactical Might +1% in siege attacks; observed cost `5700`.
- `Emergency Rescue I` — in round 4, if the Cavalry squad has the lowest troop power among friendly squads, gain a shield making the next damage taken 30% lower for 1 round; observed cost `36100`.
- `Solidarity` — Cavalry Resistance +1% when joining rally attacks; observed costs shown include `7640` and `8020` in different captures. Treat these as state/account-context observations, not a single canonical cost until the cost semantics are confirmed.
- `Revival` — Cavalry HP +6%; observed cost `30700`.

## 7. What DeepSeek may implement now

1. Preserve the existing canonical IDs, names, effects, node counts, and passive IDs.
2. Add/repair visual arrangement metadata for the four researches using the positions and icon groups above.
3. Add selected detail/evidence records with the exact source filenames and observed costs.
4. Preserve `large`/`major`/`passive` node presentation; do not render these as ordinary nodes.
5. Keep all connections `arrangement-only` unless a later partial-unlock sequence proves direction.
6. Add focused tests for node counts, repeated-node identities, labels, effects, evidence filenames, and unknown directed prerequisites.

## 8. What remains unproven

- Directed unlock order for every connection in all four graphs.
- Whether every displayed cost is a per-level/current-level cost, a full-node cost, or account-state UI value.
- Complete lower topology for Call of Glory I and Enhanced Tactics I because the screenshots are vertically cropped.
- A reliable mapping from every repeated visual icon to a node ID using image position alone if the canonical ordering changes.

## 9. DeepSeek handoff instruction

Implement this document as an evidence overlay or equivalent structured fixture. Do not inspect the
WhatsApp images to make independent topology decisions. Do not populate `prerequisiteNodeIds` from
the lines in completed graphs. If a source filename cannot be located in the repository, preserve the
external source reference and leave the asset-copy step for the owner.
