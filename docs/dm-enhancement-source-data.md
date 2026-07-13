# Dragon Master Enhancement Source Data

Status: semantics + scope CONFIRMED by owner 2026-07-12 (cumulative from +0; +25 in v14 scope; milestone-granularity only). Clean icons still pending — honest labeled-resource UI used meanwhile.
Data contributor: Redbull 1097
DM tool contributor: Roha 1097
Captured: 2026-07-12

Visual source: `D:\Project\hero-combo-creator2\.codex-remote-attachments\019f5026-0ae6-7193-b933-65b0be78d337\7936d99a-73dc-4b51-82a3-f68e8a853ba4\1-Photo-1.jpg`

## Interpretation gate

The supplied figures are recorded exactly below. Do not wire them into production calculations until the owner confirms whether each milestone is:

1. the cumulative total required to reach that enhancement level from +0, or
2. the additional cost for only that milestone interval.

The owner originally described +1 through +20, but the supplied source also includes +25. The planner backlog therefore includes +25 unless the owner removes it.

### Resolution (owner, 2026-07-12)

- **Semantics: CUMULATIVE.** Each milestone row is the running total required to reach that level from +0 (not per-interval). Confirmed by the owner ("follow the tables data") and consistent with the stone-composition bands they described (1 stone through +5, 2 through +10, all 3 from +11 — matching Exotic first appearing at +10 and Dragon first appearing above +10).
- **+25 is in v14 scope.**
- **Verified levels only.** Targets include +5/+10/+15/+20/+25 plus the supplied +11 transition. Unknown intermediate levels are not interpolated.
- **Icons captured.** The three supplied in-game resource identities are extracted into the local enhancement sprite used by the planner.

## One Dragon Master piece

| Target | Super Dragon Core | Exotic Crystal | Dragon Crystal |
|---:|---:|---:|---:|
| +5 | 25,200 | 0 | 0 |
| +10 | 75,700 | 6,000 | 0 |
| +11 | 88,700 | 7,600 | 8 |
| +15 | 178,700 | 15,000 | 200 |
| +20 | 284,500 | 50,200 | 500 |
| +25 | 395,300 | 86,700 | 818 |

## Full six-piece Dragon Master set

| Target | Super Dragon Core | Exotic Crystal | Dragon Crystal |
|---:|---:|---:|---:|
| +5 | 151,200 | 0 | 0 |
| +10 | 454,200 | 36,000 | 0 |
| +15 | 1,072,200 | 90,000 | 1,200 |
| +20 | 1,707,000 | 301,200 | 3,000 |
| +25 | 2,371,800 | 520,200 | 4,908 |

## Arithmetic validation

Every supplied full-set value is exactly six times the matching one-piece value. The production model should therefore keep the one-piece milestone table as the canonical numeric source and derive the six-piece display totals, while retaining regression assertions against the supplied full-set figures.

## Confirmed icon mapping and per-level sample

The supplied in-game `Advance Equipment` screenshot shows the +10 to +11 transition for a Dragon Master helmet.

| Resource | In-game appearance | Owned / required shown | Required for +10 → +11 |
|---|---|---:|---:|
| Super Dragon Core | Green dragon-shaped crystal in a purple frame | 555 / 13,000 | 13,000 |
| Exotic Crystal | Red shard in a purple frame | 75,217 / 1,600 | 1,600 |
| Dragon Crystal | Orange-red crystal in a gold frame | 46 / 8 | 8 |

The screenshot is valid mapping and cost evidence, but its icons are small and partially affected by the game’s particle/background treatment. Do not claim clean transparent production icons from this screenshot alone.

## Missing before implementation

- Clean close-up or original in-game icons for Super Dragon Core, Exotic Crystal, and Dragon Crystal.
- Confirmation of cumulative-versus-interval semantics.
- Confirmation that +25 is in v14 scope.
- Any per-level (+1, +2, and so on) values if the tool must calculate non-milestone targets rather than milestone-only targets.
- Screenshot/source confirmation for final regression evidence.
