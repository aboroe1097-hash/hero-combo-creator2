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
- **Drafted as:** `2026-07-14-voting-contribution-close-v1-en`

## Draft messages

### 2026-07-14-voting-contribution-close-v1-en

- **Status:** `draft`
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

**Subject:** [SUBJECT]

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
