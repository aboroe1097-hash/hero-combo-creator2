# Velo 1.0 — rebrand, naming system, and presence plan

Status: implemented for the **16.5.10** release lane (PR #249), which took the next free patch
after the owner's own 16.5.9 release landed. This doc records the brainstorm behind Velo 1.0:
what is wrong with today's assistant identity, the naming decision and its rejected alternatives,
the layout and responsiveness fixes, and the presence backlog that did not fit this release.

## 1. Critical read of the assistant today

Velo is one assistant with four labels that disagree with each other:

| Surface | Says | File |
| --- | --- | --- |
| System prompt identity | "You are Velo… build Velo **b0.4**" | `workers/ai/prompt.js` |
| Chat header | kicker "VTS Assistant", title "Talk with Velo", badge **"Beta 0.4"** | `tabs/ai-assistant.html` |
| Floating launcher | eyebrow "VTS Assistant", label "Talk with Velo" | `js/ai-launcher.js` |
| Toolkit map (answers "what version is this?") | "build Velo b0.4" | `js/ai/toolkit-map.js` |

Problems this creates:

1. **Two version schemes, neither user-facing.** `b0.4` is internal build numbering that leaked
   into the product; "Beta 0.4" repeats it in a badge that promises less than the product delivers.
   A user asking "what version is this?" gets `b0.4` while the site itself is on 16.5.x.
2. **The badge is the only untranslated chip in the header.** "Beta" is an English word sitting in
   thirteen locales. A version number needs no translation — the fix is to make the chip a version,
   not to translate a beta label.
3. **Name vs role vs CTA is actually fine — but only if the hierarchy is deliberate.** "Velo" is
   the name, "VTS Assistant" the role, "Talk with Velo" the call to action. The failure today is
   that the *title* slot carries the CTA while the version slot carries marketing ("Beta").
4. **Presence is one corner of one page family.** The command palette (Ctrl/Cmd+K) has no Velo
   entry at all, even though it already carries a dead `tabAi` key translated in thirteen locales
   and consumed nowhere. Three standalone tools (Specialization Towers, Battle Simulator, VtsScore)
   never show the launcher.
5. **Breakpoints are fine — one correction to an earlier draft of this plan.** The drawer family
   uses a single phone breakpoint, `max-width: 620px` (drawer CSS, assistant CSS blocks, and the
   drawer's `matchMedia`), and the `640px` in `css/ai-assistant.css` is the welcome block's
   `max-width`, not a breakpoint — shrinking it to 620 would only make that block smaller for no
   reason. The floating launcher keeps its own 640px phone band (scroll-hide, phone-nav clearance)
   in `public/ai-launcher-critical.css` and `js/ai-launcher.js`; it is deliberately unchanged here,
   because it governs the launcher's auto-hide behaviour that already has dedicated phone tests.
6. **Small-target and overflow debt in the chat chrome**: the message copy button is 32px high, the
   source chips have no minimum height, and the answer tables force horizontal scroll on 320px
   phones because the table floor is a flat `min-width: 320px` plus wrapper padding. The header row
   is `flex-wrap: nowrap`, so inside a 520px drawer the mascot, two buttons, and title squeeze
   before the mobile grid ever kicks in.

## 2. Naming — options considered

Research (Nielsen Norman Group on humanizing AI and the ELIZA effect; Copilot/Sidekick/Fin naming;
Duolingo's mascot personas) says: role names that keep the human in charge beat power names;
mascot + name pairing is the strongest non-human cue; version tags are emerging as trust devices;
drop "Beta" when reliability becomes the pitch.

**A. Keep "Velo", graduate to "Velo 1.0", make the system deliberate (chosen).**
The name is already paid for: mascot art, the helmet lore (Abo's gift), the Eden Siege avatar,
prompt identity, thirteen locale translations of "Talk with Velo", the sheets registry. "Velo" is
short, pronounceable in every supported locale, searchable, and reads as *velocity* — quick
answers. The rebrand is systemic, not lexical: name **Velo**, role **VTS Assistant**, CTA
**Talk with Velo**, version **Velo 1.0**. The `b0.4` build numbering is retired everywhere.

**B. Rename to a modest-rank role name (Scout, Sidekick, Quartermaster).**
Defensible on research grounds — such names encode the job and keep the user in charge — but the
rename cost is real brand destruction: every locale string, the mascot filenames and lore, the
game copy in Eden Siege, the prompt identity block ("Your name is Velo… never say that you have no
personal name"), and community familiarity. Only worth it if the name "Velo" itself is the problem,
and nothing suggests it is.

**C. Compound brand ("VTS Velo", "Velo by VTS").** Adds syllables, adds nothing. Rejected.

Also rejected: power names (Sage, Oracle, Genie) — they promise omniscience and fight the
"can make mistakes" disclaimer; human names without a mascot — the ELIZA effect invites false
expectations of empathy and confidentiality, and Velo's dragon form is precisely the non-human
cue that defuses it.

### The chosen label system

| Slot | Value | Notes |
| --- | --- | --- |
| Name | Velo | Proper noun, never translated |
| Role | VTS Assistant | `ai.kicker`, already localized in every locale |
| CTA | Talk with Velo | `ai.nav` / `ai.title`, already localized |
| Version chip | **Velo 1.0** | Replaces "Beta 0.4"; a version string needs no translation |
| Prompt build string | "Velo 1.0" | Replaces "Velo b0.4" in `workers/ai/prompt.js` |

## 3. Layout and responsiveness fixes shipped here

1. **44px touch targets where fingers land**: the message copy button and source chips reach 44px
   on phones (inside the 620px media blocks only), matching the site-wide target rule without
   inflating desktop chrome.
2. **Tables stop forcing horizontal scroll on 320px phones**: the row floor becomes
   `min-width: min(320px, 100%)` so a narrow table shrinks with its wrapper while wide answers keep
   their scroll.

Both fixes are checked in a real browser at 320px and 390px — the same widths the existing phone
matrix already uses — so the claims are layout measurements, not source-text assertions.

Deferred from an earlier draft of this plan (not shipped, kept honest here): the "one shared
breakpoint" idea was based on a misreading of the 640px welcome max-width, and the header-wrap
idea is superseded by the ≤620px grid layout that already restructures the header on phones.

Known issue kept open (P3 in `design-qa.md`): the expanded launcher pill can still overlap
page content on narrow desktop viewports. Fixing it properly needs a collision-avoidance pass
against the active form area; the compact toggle and normal scroll already keep content reachable.

## 4. Presence

Shipped in 1.0:

- **Command palette entry.** Ctrl/Cmd+K now finds "Talk with Velo" and opens the drawer, wired
  through the previously dead `tabAi` key — the thirteen existing translations get a consumer for
  free. The palette action lazy-imports the drawer module, so no page pays for Velo until asked.
- **Version chip as a trust mark.** The header now states "Velo 1.0" where "Beta 0.4" used to
  under-promise.

Backlog — the big add-ons proposed for 1.0 and deliberately deferred to follow-up releases
(recorded here, not dropped). Each needs its own release lane:

1. **"My Velo" personal answers.** For a signed-in member, answer from their own data: Competition
   #12 growth against their baseline, their Eden duty score breakdown (main and alt weights),
   their votes, their Top-list rank. Read only from existing published projections and the
   member's own documents; never show another member's private values unless that member
   consented.
2. **Screenshot understanding.** Drop a game screenshot into the drawer, starting with the
   Lord Info → Power screen. Reuse the existing Worker OCR endpoint, then answer "what should I
   upgrade next?" with Research planner, Buildings and Towers data. Show the read values for
   confirmation before acting on them.
3. **Answers that open the exact tool.** Each answer ends with buttons that open the right state:
   Combo Generator with those heroes filled in, Eden Map zoomed to the structure, Research
   planner on that path. The tool-envelope plumbing already exists.
4. **Deadline reminders.** A small line in the drawer, e.g. "Competition #12 re-upload closes in
   5h (game time 22:00 · your time …)". Use `js/game-time.js` and the published schedule, never
   hard-coded times.
5. **Admin Velo (superadmin only, read-only).** Plain-language questions over VTS Admin data,
   e.g. "who hasn't done a banner this week?" or "why is X's score lower than last week?". Must
   follow the Firestore rules and have no write tools.
6. **Quality gate.** A fixed question set with expected answers in en, ar, ru and zh run through
   velo:lab in CI, checking tool choice and facts, failing the build when the changelog digest is
   out of date.

Smaller backlog items from the naming/UX research:

- **Launchers on the standalone tools** (Specialization Towers, VtsScore; Battle Simulator only
  after its gate story is settled). Needs each page's snapshot tests taught to hide the launcher.
- **Contextual launcher copy per active tab** — e.g. "Stuck on your lineup?" on the Generator,
  "Which node next?" in Research — instead of one static eyebrow (Amazon Rufus pattern: broad
  chips on home, page-specific chips on detail pages).
- **Tab-aware suggestion chips** — the welcome chips filtered by the active app tab, so Eden
  players see Eden questions first.
- **Resizable drawer** for rich answers (NN/g: drawers carrying wide content must be resizable).
- **Save/share answers** — currently a deliberate session-only privacy stance; any change needs a
  consent story first.

### Constraints every add-on above must respect

- **Model API cost and rate limits**: show a clear, translated message when the Worker is down or
  throttled.
- **Prompt injection**: screenshots, player names and pasted text are untrusted data only, never
  instructions (already the system prompt's stance; keep it for every new input surface).
- **Privacy and consent**: per-chat consent categories stay the gate for personal data.
- **Phones**: 44px tap targets, tested at 320px and 390px.
- **All 13 languages, including right-to-left.**
- **Keyboard focus correctness** whenever the palette opens the drawer.
- **Size budgets** (`npm run size:check`); new lazy chunks over eager CSS where the budgets are
  tight.
- **Deploy attribution**: every PR lists which parts need a Cloudflare Worker redeploy and which
  need a Firestore rules deploy. Velo 1.0 needs `npm run worker:deploy` for the prompt wording;
  no rules deploy.

## 5. What "1.0" deliberately does not change

- The personality. The voice rules, helmet lore, and "warming up a tiny fire" status lines are
  working brand; research's caution about faux-cognitive "thinking…" applies to fake cognition, not
  to a mascot's playful status copy.
- The privacy posture: session-only history, per-chat consent categories, provider disclosure.
- The provider layer (Gemini/DeepSeek adapters) and the tool registry.
