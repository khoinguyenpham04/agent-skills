---
name: adversarial-review
description: Iterative adversarial review of the current branch via the second-opinion agent (Opus). Loops fix → re-review until convergence. Use when the user wants a thorough, ruthless review of their changes before shipping.
---

Run an iterative adversarial review of the current branch using the `second-opinion` sub-agent. Loop until convergence.

## Procedure

1. **Spawn the sub-agent.** Use the Agent tool with `subagent_type: second-opinion` (it is pinned to Opus). In the prompt, instruct it to:
   - Load the `adversarial-reviewer` skill (via the Skill tool) before reviewing, if the project has one.
   - Review the diff of the current branch against its base (use `git merge-base` to find the fork point, then diff against that). If the user scoped the review to specific files or a different range, pass that scope instead.
   - Return findings as a structured list with severity (blocker / major / minor / nit) and a concrete location (`file:line`) for each.
   - Be ruthless. Assume bugs exist. No benefit of the doubt.

2. **Evaluate findings.** For each finding the sub-agent returns:
   - Decide whether you agree. State your reasoning briefly.
   - If valid: fix it.
   - If invalid or already addressed: note why and move on.
   - If a nit: log it but don't necessarily fix unless trivial.

3. **Re-review.** Continue the SAME sub-agent via SendMessage (using the agent id/name from the previous spawn) so its context compounds across cycles. Tell it exactly what you changed and ask it to re-review the fixes plus anything it hasn't yet cleared.

4. **Repeat** steps 2-3 until one of:
   - No findings remain.
   - Only nits remain (and you've decided which to skip).
   - The sub-agent confirms convergence ("CLEAN").

5. **Report.** Summarise what changed, what was rejected and why, and any remaining nits left intentionally unfixed.

## Rules

- Track each review cycle with the todo list; one `in_progress` item at a time.
- Do not declare done until the sub-agent's latest pass returns clean or nits-only.
- Run the project's lint/typecheck/test commands between cycles where relevant — a "fix" that breaks the build is not a fix.
- Preserve the sub-agent session across cycles (SendMessage, not a fresh spawn) so context compounds. Only spawn fresh if the previous agent is unreachable.
- Never let the sub-agent edit code — it reviews, you fix.

$ARGUMENTS
