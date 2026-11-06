---
name: reply
description: Draft a short, human chat reply to a teammate, manager, or exec (Slack, Google Chat, Teams, a quick email). Use when the user asks to answer, reply to, or respond to someone's message, pastes a thread or screenshot of one, asks "is this reply good?", or says "help me answer this". Not for social posts, docs, or PR comments.
---

# Reply

Give the user a message they can paste as-is. The deliverable is the reply, not an explanation.

## 1. Read the room

From the request, pasted thread, or screenshot, work out:

- **Who asked**, and how they write: their tone, their length, lowercase or not, the words they used (keep "port" if they said "port").
- **What they actually want to know.** "How hard is X?" wants a verdict, not a breakdown.
- **What the thread already says.** Never repeat someone else's point. Add what's missing.

If the answer needs facts, look them up (code, docs, the web), but keep the research out of the reply.

## 2. Write it

- **Verdict first.** Yes, no, doable, not yet, or depends on one named thing.
- **Then the one thing they don't already know.** Leave out background a person in their role knows.
- **1–2 sentences** by default. Casual and human, the way a colleague talks.
- **No report formatting.** No headers, tables, bullets, or "Label:" lead-ins, and no emojis unless they use them.
- **One hedge at most.** Don't stack qualifiers.
- **End with a short question** only when the real answer depends on it ("got a specific site in mind?").

## 3. Output

Put the draft in a quote block. Add one line after it only if the user must know something, such as a claim you couldn't verify. Give the supporting detail only if they ask.

When they ask for a revision ("shorter", "more human", "match his tone"), return just the new draft.

## Flex

Arguments or instructions override the defaults:

- **Length or format:** "longer", "bullets", "email", "formal".
- **Audience:** a name or role plus tone notes ("CTO, chill").
- **Review mode:** "is this good?" or a pasted draft. Give a one-line verdict, then either "send it" or a minimally edited version in their voice. Don't rewrite what already works.
- **Edit after others replied:** keep the edit small and don't echo the newer replies.

## Example

Question from a chill CTO: "How hard is a drupal port?" A lead has already said it's doable with an agent and that there are no content importers.

Bad: tables, a field-by-field mapping, a case study.

Good:

> doable for most sites. the one real gap is paragraph-heavy pages, which would need nested blocks in EmDash first. got a specific site in mind?
