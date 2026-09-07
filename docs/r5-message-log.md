# VTS 1097 R5 message log

This is the append-only ledger for Viber, in-game mail, and alliance or guild announcements drafted
for MalakAbo. Writing and approval rules live in
[`r5-communications-guide.md`](r5-communications-guide.md).

Do not mark a message `approved` or `sent` without the owner's confirmation. Do not overwrite sent
text; append a new version and mark the earlier entry `superseded`.

## Request intake history

### 2026-07-14-pending-multichannel-01

- **Status:** `draft`
- **Requested by:** MalakAbo
- **Channels:** Viber, in-game mail, alliance/guild announcement
- **Audience:** All VTS 1097 members
- **Language:** English
- **Topic:** Voting and contribution tracking closure, review window, final data lock, and reward
  timing
- **Required action:** Review personal data online during the Saturday review window and report any
  missing or incorrect information before the Sunday lock
- **Deadline:** Voting and contribution tracking close Friday, 17 July 2026 at 23:59 game time;
  corrections close when data locks Sunday, 19 July 2026 at 00:00 game time
- **Reason/context:** Give every member 24 hours on Saturday to verify their data before records are
  locked and rewards are prepared for Monday morning
- **Confirmed channel constraints:** Viber supports unrestricted length, rich text, and images;
  in-game mail is limited to 500 characters and seven lines with no images; alliance announcements
  are limited to 200 characters. In-game text must avoid known filtered terms.
- **Drafted as:** `2026-07-14-voting-contribution-close-v1-en`, revised as
  `2026-07-14-voting-contribution-close-v2-en`, then
  `2026-07-14-voting-contribution-close-v3-en`, then
  `2026-07-14-voting-contribution-close-v4-en`

## Draft messages

### 2026-07-14-voting-contribution-close-v1-en

- **Status:** `superseded`
- **Requested by:** MalakAbo, R5
- **Approved by:** Pending MalakAbo approval
- **Audience:** All VTS 1097 members
- **Channels:** Viber, in-game mail, alliance/guild announcement
- **Language:** English
- **Topic:** Voting and contribution tracking deadline and final review
- **Required action:** Review personal Eden X1 data on Saturday and report any problem before the
  Sunday lock
- **Deadline:** Friday, 17 July 2026 at 23:59 game time for voting/tracking; Sunday, 19 July 2026 at
  00:00 game time for corrections
- **Source facts:** Owner confirmation in the 2026-07-14 Codex task
- **Supersedes:** None; fulfills `2026-07-14-pending-multichannel-01`
- **Superseded by:** `2026-07-14-voting-contribution-close-v2-en` after the owner clarified that
  his authority is implicit and management messages should say `contact me` instead of using an R5
  signature
- **Sent at:** Not sent
- **In-game mail count:** One

#### Viber

```text
"VOTING & CONTRIBUTION DEADLINE"

Hello everyone,

Voting and contribution tracking will close on Friday, 17 July at 23:59 game time.

"24-HOUR REVIEW WINDOW"

All members will then have Saturday, 18 July (00:00-23:59 game time) to review their data online:
https://abocombo.web.app/eden-x1.html

Please report any missing or incorrect information during this review window so we can correct it before the final lock.

"FINAL LOCK & REWARDS"

The data will be locked on Sunday, 19 July at 00:00 game time. After the lock, the final records will be prepared so rewards can be sent first thing Monday, 20 July after 00:00 game time.

Please review your data early and do not wait until the end of Saturday.

- MalakAbo, R5
```

#### In-game mail

**Subject:** Voting & Contribution Deadline

```text
Voting and contribution tracking close Friday, 17 July at 23:59 game time.
You then have 24 hours on Saturday, 18 July to review your data and report any missing or incorrect information.
Open the Eden X1 page in the VTS toolkit to check your record.
Data locks Sunday, 19 July at 00:00 game time.
Rewards are planned for Monday, 20 July after 00:00 game time.
Questions or corrections: contact R4/R5.
MalakAbo, R5
```

#### Alliance/guild announcement

```text
DEADLINE: Voting and contribution tracking close Fri 17 Jul, 23:59 game time. Review your Eden X1 data on Sat and report issues. Check the latest in-game mail.
```

#### Review notes

- Viber formatting/images: Quoted headings identify the text to format in bold; no image is needed
  for this message
- In-game mail: 414 characters, seven lines
- Additional in-game parts: None
- In-game filtered-word scan: Pass for known risky terms `buy`, `bonus`, `free`, `Viber`,
  `WhatsApp`, and other named chat apps
- Alliance announcement: 159 / 200 characters; filtered-word scan passed
- Fact, privacy, and translation review: No private player, vote, or admin details included; English
  draft awaiting owner approval

### 2026-07-14-voting-contribution-close-v2-en

- **Status:** `superseded`
- **Requested by:** MalakAbo
- **Approved by:** Pending MalakAbo approval
- **Audience:** All VTS 1097 members
- **Channels:** Viber, in-game mail, alliance/guild announcement
- **Language:** English
- **Topic:** Voting and contribution tracking deadline and final review
- **Required action:** Review personal Eden X1 data on Saturday and report any problem before the
  Sunday lock
- **Deadline:** Friday, 17 July 2026 at 23:59 game time for voting/tracking; Sunday, 19 July 2026 at
  00:00 game time for corrections
- **Source facts:** Owner confirmation in the 2026-07-14 Codex task
- **Supersedes:** `2026-07-14-voting-contribution-close-v1-en`
- **Superseded by:** `2026-07-14-voting-contribution-close-v3-en` after the owner supplied the live
  production URL, the filter-safer in-game URL, and confirmed that in-game mail has no subject field
- **Sent at:** Not sent
- **In-game mail count:** One

#### Viber

```text
"VOTING & CONTRIBUTION DEADLINE"

Hello everyone,

Voting and contribution tracking will close on Friday, 17 July at 23:59 game time.

"24-HOUR REVIEW WINDOW"

All members will then have Saturday, 18 July (00:00-23:59 game time) to review their data online:
https://abocombo.web.app/eden-x1.html

Please report any missing or incorrect information during this review window so we can correct it before the final lock.

"FINAL LOCK & REWARDS"

The data will be locked on Sunday, 19 July at 00:00 game time. After the lock, the final records will be prepared so rewards can be sent first thing Monday, 20 July after 00:00 game time.

Please review your data early. If anything is missing or incorrect, contact me during Saturday's review window.
```

#### In-game mail

**Subject:** Voting & Contribution Deadline

```text
Voting and contribution tracking close Friday, 17 July at 23:59 game time.
You then have 24 hours on Saturday, 18 July to review your data and report any missing or incorrect information.
Open the Eden X1 page in the VTS toolkit to check your record.
Data locks Sunday, 19 July at 00:00 game time.
Rewards are planned for Monday, 20 July after 00:00 game time.
If anything is missing or incorrect, contact me.
```

#### Alliance/guild announcement

```text
DEADLINE: Voting and contribution tracking close Fri 17 Jul, 23:59 game time. Review your Eden X1 data Sat; contact me about any issue. Check the latest in-game mail.
```

#### Review notes

- Viber formatting/images: Quoted headings identify the text to format in bold; no image is needed
  for this message
- In-game mail: 409 characters, six lines
- Additional in-game parts: None
- In-game filtered-word scan: Pass for known risky terms `buy`, `bonus`, `free`, `Viber`,
  `WhatsApp`, and other named chat apps
- Alliance announcement: 166 / 200 characters; filtered-word scan passed
- Voice review: No signature or R5 self-identification; management issues use `contact me`
- Fact, privacy, and translation review: No private player, vote, or admin details included; English
  draft awaiting owner approval

### 2026-07-14-voting-contribution-close-v3-en

- **Status:** `superseded`
- **Requested by:** MalakAbo
- **Approved by:** Pending MalakAbo approval
- **Audience:** All VTS 1097 members
- **Channels:** Viber, in-game mail, alliance/guild announcement
- **Language:** English
- **Topic:** Voting and contribution tracking deadline and final review
- **Required action:** Review personal Eden X1 data on Saturday and report any problem before the
  Sunday lock
- **Deadline:** Friday, 17 July 2026 at 23:59 game time for voting/tracking; Sunday, 19 July 2026 at
  00:00 game time for corrections
- **Source facts:** Owner confirmation in the 2026-07-14 Codex task; live page
  `https://roc-vts.com/eden-x1.html`
- **Supersedes:** `2026-07-14-voting-contribution-close-v2-en`
- **Superseded by:** `2026-07-14-voting-contribution-close-v4-en` after the owner clarified his
  numbered in-game style, preferred opening, light emoji use, and separate link-mail flow
- **Sent at:** Not sent
- **In-game mail count:** One

#### Viber

```text
"VOTING & CONTRIBUTION DEADLINE"

Hello everyone,

Voting and contribution tracking will close on Friday, 17 July at 23:59 game time.

"24-HOUR REVIEW WINDOW"

All members will then have Saturday, 18 July (00:00-23:59 game time) to review their data online:
https://roc-vts.com/eden-x1.html

Please report any missing or incorrect information during this review window so we can correct it before the final lock.

"FINAL LOCK & REWARDS"

The data will be locked on Sunday, 19 July at 00:00 game time. After the lock, the final records will be prepared so rewards can be sent first thing Monday, 20 July after 00:00 game time.

Please review your data early. If anything is missing or incorrect, contact me during Saturday's review window.
```

#### In-game mail

```text
Voting and contribution tracking close Friday, 17 July at 23:59 game time.
You have 24 hours on Saturday, 18 July to review your data and report any missing or incorrect information.
Review your data at:
roc-vts.com/eden-x1
Data locks Sunday, 19 July at 00:00 game time.
Rewards are planned for Monday, 20 July after 00:00 game time.
If anything is missing or incorrect, contact me.
```

#### Alliance/guild announcement

```text
DEADLINE: Voting and contribution tracking close Fri 17 Jul, 23:59 game time. Review your Eden X1 data Sat; contact me about any issue. Check the latest in-game mail.
```

#### Review notes

- Viber formatting/images: Quoted headings identify the text to format in bold; live production URL
  used; no image is needed for this message
- In-game mail: 382 characters, seven lines, no subject field
- In-game link: Filter-safer `roc-vts.com/eden-x1` form supplied by the owner
- Additional in-game parts: None
- In-game filtered-word scan: Pass for known risky terms `buy`, `bonus`, `free`, `Viber`,
  `WhatsApp`, and other named chat apps
- Alliance announcement: 166 / 200 characters; filtered-word scan passed
- Voice review: No signature or R5 self-identification; management issues use `contact me`
- Fact, privacy, and translation review: No private player, vote, or admin details included; English
  draft awaiting owner approval

### 2026-07-14-voting-contribution-close-v4-en

- **Status:** `draft`
- **Requested by:** MalakAbo
- **Approved by:** Pending MalakAbo approval
- **Audience:** All VTS 1097 members
- **Channels:** Viber, two consecutive in-game mails, alliance/guild announcement
- **Language:** English
- **Topic:** Voting and contribution tracking deadline and final review
- **Required action:** Review personal Eden X1 data on Saturday and report any problem before the
  Sunday lock
- **Deadline:** Friday, 17 July 2026 at 23:59 game time for voting/tracking; Sunday, 19 July 2026 at
  00:00 game time for corrections
- **Source facts:** Owner confirmation in the 2026-07-14 Codex task; live page
  `https://roc-vts.com/eden-x1.html`
- **Supersedes:** `2026-07-14-voting-contribution-close-v3-en`
- **Sent at:** Not sent
- **In-game mail count:** Two consecutive mails; the second contains the filter-safer link

#### Viber

```text
"VOTING & CONTRIBUTION DEADLINE" 📌

Lads and Gens,

Voting and contribution tracking will close on Friday, 17 July at 23:59 game time.

"24-HOUR REVIEW WINDOW"

All members will then have Saturday, 18 July (00:00-23:59 game time) to review their data online:
https://roc-vts.com/eden-x1.html

Please report any missing or incorrect information during this review window so we can correct it before the final lock.

"FINAL LOCK & REWARDS"

The data will be locked on Sunday, 19 July at 00:00 game time. After the lock, the final records will be prepared so rewards can be sent first thing Monday, 20 July after 00:00 game time.

Please review your data early. If anything is missing or incorrect, contact me during Saturday's review window.
```

#### In-game mail 1/2

```text
Lads and Gens, 📌
1) Voting and contribution tracking close Fri, 17 Jul at 23:59 game time.
2) You have 24 hours on Sat, 18 Jul to review your data and report any issue.
3) Data locks Sun, 19 Jul at 00:00 game time.
4) Rewards are planned for Mon, 20 Jul after 00:00 game time.
The review link is in my next mail.
If anything is missing or incorrect, contact me.
```

#### In-game mail 2/2

```text
📌 EDEN X1 REVIEW
Open:
roc-vts.com/eden-x1
Use Saturday, 18 July to check your data.
If anything is missing or incorrect, contact me.
```

#### Alliance/guild announcement

```text
Lads and Gens: Voting and contribution tracking close Fri 17 Jul, 23:59 game time. Review on Sat and contact me about issues. Check my last 2 in-game mails.
```

#### Review notes

- Viber formatting/images: One light emoji; quoted headings identify text to format in bold; live
  production URL used; no image needed
- In-game mail 1: 362 characters, seven lines; numbered schedule flow
- In-game mail 2: 134 characters, five lines; filter-safer link isolated in the follow-up mail
- In-game filtered-word scan: Both mails pass for known risky terms `buy`, `bonus`, `free`, `Viber`,
  `WhatsApp`, and other named chat apps
- Alliance announcement: 156 / 200 characters; points to the last two in-game mails and passes the
  filtered-word scan
- Voice review: Opens with `Lads and Gens`, uses one light emoji, has no signature or R5
  self-identification, and says `contact me`
- Fact, privacy, and translation review: No private player, vote, or admin details included; English
  draft awaiting owner approval

## Approved and sent messages

No approved or sent message has been recorded in this ledger yet.

## Entry template

Copy this block for each new version. Use an ID such as
`2026-07-14-eden-vote-v1-en`.

```markdown
### [MESSAGE ID]

- **Status:** `intake_needed | draft | approved | sent | cancelled | superseded`
- **Requested by:** [NAME/ROLE]
- **Approved by:** [NAME/ROLE OR PENDING]
- **Audience:** [AUDIENCE]
- **Channels:** [VIBER / IN-GAME MAIL / ALLIANCE ANNOUNCEMENT]
- **Language:** [LANGUAGE]
- **Topic:** [TOPIC]
- **Required action:** [ACTION]
- **Deadline:** [ABSOLUTE DATE AND GAME TIME/TIME ZONE]
- **Source facts:** [LINK, FILE, PAGE, OR OWNER CONFIRMATION]
- **Supersedes:** [MESSAGE ID OR NONE]
- **Sent at:** [DATE/TIME PER CHANNEL OR NOT SENT]
- **In-game mail count:** [NUMBER OF CONSECUTIVE PARTS]

#### Viber

[EXACT TEXT]

#### In-game mail

[EXACT TEXT]

#### Alliance/guild announcement

[EXACT TEXT]

#### Review notes

- Viber formatting/images: [CHECKED / NOT APPLICABLE]
- In-game part 1: [CHARACTER COUNT] characters, [LINE COUNT] lines
- Additional in-game parts: [COUNTS OR NONE]
- In-game filtered-word scan: [PASS / TERMS TO REWRITE]
- Alliance announcement: [CHARACTER COUNT] / 200 characters
- Fact, privacy, and translation review: [NOTES]
```

## Ledger maintenance and retrieval

Use message ID, date, channel, language, and status to find a record. A documentation edit is never approval to send a draft or change its status. Preserve original sent text and append corrections as new versions with explicit references. Do not copy private message content into a public bug report or reusable Velo knowledge.

[Communications rules](r5-communications-guide.md) · [Knowledge intake](velo-knowledge-ingestion.md) · [Documentation index](README.md)
