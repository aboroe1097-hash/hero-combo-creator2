# VTS 1097 R5 communications guide

This document is the source of truth for drafting VTS 1097 operational messages for Viber,
in-game mail, and short alliance or guild announcements. It records how MalakAbo communicates as
R5, the checks every message must pass, and how approved or sent versions are logged.

Operational messages are deliberately separate from Velo's public strategy knowledge. A dated
order, deadline, player matter, or private leadership decision must not become reusable game advice
or be presented later as a current instruction.

## MalakAbo voice profile

This is a working profile based on the owner's observed requests and published VTS leadership
material. Refine it only from messages MalakAbo approves; do not infer permanent style rules from a
single rushed chat message.

- **Direct and action-first.** State what members need to do before the supporting explanation.
- **Collective leadership voice.** Prefer `we`, `our team`, and `VTS` when the action belongs to the
  alliance; use `I` when the decision or responsibility is specifically the R5's.
- **Friendly but firm.** Sound human and encouraging without weakening deadlines or requirements.
- **Transparent about the reason.** Briefly explain how an action helps the team, preserves
  fairness, saves resources, or supports the current plan.
- **Exact about timing.** Use an absolute date plus `game time`; avoid relying only on `today`,
  `tomorrow`, or the sender's local time.
- **Fair and accountable.** Explain eligibility, review, changes, and appeal/contact routes when a
  message affects rewards, rankings, assignments, or conduct.
- **Compact, not corporate.** Use plain English and short paragraphs. Keep the owner's directness,
  but correct accidental spelling and typing errors in official messages.
- **Confident without inventing certainty.** Clearly label a plan, estimate, draft, or pending
  decision instead of presenting it as final.

A normal MalakAbo message flow is:

1. Short greeting or direct context.
2. Required action.
3. Exact deadline or start time in game time.
4. One short reason or fairness note.
5. Where to ask questions or confirm completion.
6. `- MalakAbo, R5` when a signature is useful.

## Required facts before drafting

Do not write a final announcement until these facts are known:

| Fact | Requirement |
|---|---|
| Topic | What is changing, starting, closing, or being requested? |
| Audience | Entire alliance, selected players, R4/R5, event participants, or another group |
| Action | One observable thing the reader must do |
| Timing | Absolute date and time, explicitly labeled as game time or another named zone |
| Authority/status | Draft plan, confirmed R5 order, reminder, correction, or final result |
| Reason | The shortest useful explanation for the action |
| Destination | Link, page, coordinates, contact, or in-game menu when required |
| Consequence | What happens after the deadline or if no action is taken, if applicable |
| Language | Master language and any required translations |

If a detail is unknown, use a visible placeholder such as `[GAME TIME]` in a draft. Never guess it.

## Universal send criteria

Every version must pass this checklist before it is marked approved or sent:

- The first screen or paragraph contains the action and timing.
- Dates, numbers, player names, links, coordinates, and reward counts match the current source.
- Relative time words are supported by an absolute date and game-time value.
- The same action, deadline, and status appear in every channel variant.
- Private rosters, raw votes, admin notes, personal disputes, and unpublished assignments are not
  exposed to a broader audience.
- A reward or ranking message separates provisional calculations from confirmed final decisions.
- A correction clearly says what changed and supersedes the earlier log entry.
- The tone is respectful and avoids public blame, sarcasm, threats, or unnecessary pressure.
- The call to action is testable: vote, reply, move, save, stop, register, upload, or confirm.
- MalakAbo has approved the final wording when the message represents an R5 decision.

## Channel rules

### Viber

Use Viber for context, discussion, links, images, and confirmation.

- Length is unrestricted for this workflow, and a post may include as many relevant images as the
  message needs.
- Use Viber's text-formatting controls for headings and emphasis instead of sending a flat wall of
  text. In the draft handoff, MalakAbo's convention is to place intended bold text in double quotes,
  for example `"ACTION REQUIRED"`; apply bold formatting to that text before sending.
- Start with a one-line summary; do not make members read a long preface to discover the action.
- Use short bullets for multiple steps and keep one main call to action per message.
- Put important links or coordinates on their own line and say what opens when clicked.
- End with a simple confirmation request when attendance or completion matters.
- A friendly emoji is acceptable when it matches the moment, but it must not replace status or
  urgency words.
- If the thread contains a correction, post a fresh correction message rather than silently editing
  the old instruction.

### In-game mail

Use in-game mail for durable instructions that members may read later.

- Subject: short, specific, and action-oriented.
- Body: action and deadline first, then the minimum explanation and contact route.
- Each mail body must be **500 characters or fewer** and **seven lines or fewer**. Count spaces and
  line breaks during review and keep a safety margin when possible.
- A longer message may be split into consecutive numbered mails such as `1/3`, `2/3`, and `3/3`.
  Keep the action and deadline understandable even if a member opens only one part first.
- Images are not supported in game mail.
- Assume limited formatting and screen space; do not rely on Markdown, complex bullets, or a long
  web link being convenient to copy.
- Repeat critical coordinates or game-time values in plain text.
- Scan for game-filtered words before approval. Known risky examples include `buy`, `bonus`, `free`,
  `Viber`, `WhatsApp`, and names of other chat apps. Rewrite naturally instead of trying to evade a
  filter: use `get` or `acquire`, `extra` or `reward`, and `contact R4/R5` or `check the latest mail`
  when those phrases preserve the intended meaning.
- Close with `MalakAbo, R5` when authorship or authority is important.

### Alliance or guild announcement

Use the short announcement field for the most important current notification, not full background.

- Keep the full announcement at **200 characters or fewer** and scan it for the same filtered words
  as in-game mail.
- One action, one timing statement, and only essential context.
- Lead with a strong label when useful: `ACTION`, `REMINDER`, `VOTING`, `EDEN`, or `CORRECTION`.
- Its normal role is to point members to recent in-game mail, for example: `Check the last 3
  in-game mails for reward details.`
- Avoid links and full explanations; direct readers to the relevant recent mail or contact R4/R5.
- Replace or supersede stale announcements promptly so the visible notice never conflicts with the
  latest order.
- Preview the complete message before saving so it is not truncated.

## Draft patterns

### Viber pattern

```text
"[SHORT HEADING TO FORMAT IN BOLD]"

Please [ACTION] by [DATE, GAME TIME].

- [Step or essential fact]
- [Step or essential fact]

This helps us [SHORT REASON]. Please [CONFIRMATION METHOD] if needed.

- MalakAbo, R5
```

### In-game mail pattern

```text
Subject: [PART 1/1] [ACTION] - [DATE OR EVENT]

Please [ACTION] by [DATE, GAME TIME].

[ONE-SENTENCE REASON OR INSTRUCTION.]

Questions: contact R4/R5.

MalakAbo, R5
```

The body above must remain within 500 characters and seven lines. When several mails are needed,
number every subject and log every exact part.

### Short announcement pattern

```text
[LABEL]: [ACTION] by [DATE, GAME TIME]. Check the last [N] in-game mails for details.
```

The complete announcement must remain within 200 characters.

## Approval and logging workflow

1. Record the request as `intake_needed` in
   [`r5-message-log.md`](r5-message-log.md) when essential facts are missing.
2. Write one master draft, then compress it into channel-specific variants.
3. Check every variant against the universal and channel criteria above, including exact character
   and line counts plus the in-game filtered-word scan.
4. Ask MalakAbo to approve the exact wording and facts.
5. Change the log status to `approved`, then record the actual send time and channel as `sent`.
6. Never rewrite history for a sent message. Add a new version and mark the old entry
   `superseded` when a correction is issued.

Allowed statuses are `intake_needed`, `draft`, `approved`, `sent`, `cancelled`, and `superseded`.

## Translation rules

- Approve one master version before translating unless timing requires parallel review.
- Preserve names, numbers, coordinates, links, status, and game-time deadlines exactly.
- Translate the intent and tone, not spelling mistakes or English sentence order.
- Record the language and reviewer in the message log.
- If no fluent reviewer is available, mark the translation as a draft rather than approved.
