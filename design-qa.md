# Eden X1 desktop ballot design QA

- Source visual truth: `D:/Extra_C/Temp/codex-clipboard-40c2b128-a069-4e77-918a-00bed940079d.png`
- Implementation screenshot: `D:/Extra_C/Codex/.codex/visualizations/2026/07/13/019f5b2e-0e64-7d93-b0d5-f39b4d2ecfef/eden-x1-team-vote-desktop-v14.0.1.png`
- Side-by-side evidence: `D:/Extra_C/Codex/.codex/visualizations/2026/07/13/019f5b2e-0e64-7d93-b0d5-f39b4d2ecfef/eden-x1-team-vote-comparison-v14.0.1.png`
- Viewport: 1280px desktop, dark theme
- State: public Eden data loaded, Team Players reward lane selected, Vote navigation active

## Full-view comparison evidence

The reference has a narrow 320px sticky rail with its own vertical scrollbar and a single long input column. The implementation reserves a 420px desktop rail at this viewport, removes nested scrolling, keeps the established Frost & Flame surface treatment, and presents the four candidate fields as a balanced two-by-two grid alongside the Team Players ranking context.

## Focused-region comparison evidence

The side-by-side artifact is already cropped around the affected ballot and its surrounding ranking context, so a second crop was not needed. Text hierarchy, cyan/mint status colors, borders, field styling, CTA treatment, and copy remain consistent with the source product. Candidate inputs measure about 170px each, the full-name field about 350px, and the rail has no horizontal overflow.

## Findings

- No actionable P0, P1, or P2 differences remain.
- P3: the expanded Velo launcher can briefly overlap the lower-right edge of the ballot at one scroll position on narrower desktop viewports. The existing compact toggle and normal page scroll keep the field reachable; a future launcher collision-avoidance pass could remove the visual overlap entirely.

## Comparison history

1. Initial reference: 320px nested-scroll rail, cramped header pills, and five vertically stacked fields.
2. First implementation: removed the nested scroll, widened the rail, grouped ballot metadata, and introduced a two-column candidate grid.
3. Final implementation: increased the desktop rail to `clamp(420px, 32vw, 480px)`, retained full-width voter identity and eligibility sections, and verified two equal candidate columns with no horizontal overflow.

## Verification

- Primary interaction tested: selected the Vote navigation control and observed its active state and transition.
- Console warnings/errors: none.
- Focused Playwright regression: passed.

Final result: passed
