# VTS 1097 R5 message log

This is the append-only ledger for Viber, in-game mail, and alliance or guild announcements drafted
for MalakAbo. Writing and approval rules live in
[`r5-communications-guide.md`](r5-communications-guide.md).

Do not mark a message `approved` or `sent` without the owner's confirmation. Do not overwrite sent
text; append a new version and mark the earlier entry `superseded`.

## Open requests

### 2026-07-14-pending-multichannel-01

- **Status:** `intake_needed`
- **Requested by:** MalakAbo
- **Channels:** Viber, in-game mail, alliance/guild announcement
- **Audience:** Not provided
- **Language:** Not provided
- **Topic:** Not provided
- **Required action:** Not provided
- **Deadline:** Not provided
- **Reason/context:** Not provided
- **Confirmed channel constraints:** Viber supports unrestricted length, rich text, and images;
  in-game mail is limited to 500 characters and seven lines with no images; alliance announcements
  are limited to 200 characters. In-game text must avoid known filtered terms.
- **Note:** The owner requested a new multichannel message and a permanent writing and logging
  process. No message text has been invented while the operational facts are missing.

Required to continue: topic, audience, required action, and exact deadline or event time. A reason,
link/contact route, language, and consequence are also needed when applicable.

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
