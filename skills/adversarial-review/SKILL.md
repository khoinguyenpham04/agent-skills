---
name: adversarial-review
description: Iterative adversarial review of the current branch. A read-only reviewer sub-agent (default second-opinion on Opus, high effort; falls back to GPT 5.6 Sol at xhigh) hunts for bugs, you fix the real ones in scope with simple tests, and it re-reviews until clean. An optional bracketed argument picks a different reviewer, e.g. [sonnet medium] or [opus 5.5 max as emdash-reviewer]. Use when the user wants a thorough, ruthless review of their changes before shipping.
---

Run an iterative adversarial review of the current branch: a reviewer sub-agent finds problems, you fix the valid ones, it re-reviews, and you loop until it comes back clean.

## Input

Arguments: $ARGUMENTS

If that line shows a literal `$ARGUMENTS`, your harness doesn't substitute arguments; read the same input from the user's message instead.

The input is optional free text (a focus, such as "only the auth changes") plus an optional reviewer spec in square brackets:

```
[<model> [<version>] [<effort>] [as <agent> [agent]]]
```

| Field | Values | Default |
| --- | --- | --- |
| model | `opus`, `sonnet`, `haiku`, `fable`, or another model your harness offers | `opus` |
| version | e.g. `5.5` | latest |
| effort | `low`, `medium`, `high`, `xhigh`, `max` | `high` |
| agent | any sub-agent type your harness offers | `second-opinion` |

Examples: `[sonnet medium]`, `[opus 5.5 high as second-opinion agent]`, `check the migration [haiku low]`. Omitted fields take their default, so `[max]` means Opus at max effort. The trailing word `agent` is optional and means nothing.

A bracket group is the reviewer spec only if it names a model, an effort level or `as <agent>`. Any other bracketed text is part of the focus. Read an obvious typo as what it clearly means (`medum` is `medium`), a model id containing a family name as that family (`claude-sonnet-4-6` is `sonnet`, asked 4.6), and a model name written with spaces as one name (`gpt 5.6 sol` is `gpt-5.6-sol`), and say so.

Resolve the reviewer before starting and state it in one line, with any version note or fallback after it, e.g. `Reviewer: second-opinion · opus · high` or `Reviewer: second-opinion · opus (asked 4.6, runs latest) · low`.

### Spawning the reviewer

- **Claude Code:** Agent tool with `subagent_type: <agent>`, `model: <model>` and `effort: <effort>`. Always pass model and effort, defaults included, so the review doesn't depend on how the agent file is pinned. `model` takes a family alias that runs the family's latest version; if the user asked for another version, say it can't be pinned and which one runs. GPT models also count as offered when `codex` is installed: they run through the Codex CLI at the requested effort, as in "Running the GPT fallback" below. If Codex rejects the model name, treat it as a failed spawn.
- **Cursor and other harnesses with per-task model choice:** pass the matching model id, e.g. `claude-opus-5-5-high`.
- **Harnesses that can't choose a sub-agent's model:** use the default and note it in the report.

### Fallback

Omitted or unreadable fields take their default. A reviewer that can't run is replaced by the fallback reviewer, **GPT 5.6 Sol at xhigh effort**:

- **Agent not offered:** use `second-opinion` and keep the model and effort. If `second-opinion` isn't available either, use a general-purpose agent with the same brief, model and effort, and tell it never to edit files.
- **Model not offered, or the spawn fails:** switch to the fallback reviewer, model and effort both, with the same brief.
- **Fallback can't run either:** use the default reviewer (Opus, high effort, `second-opinion`). If the default is what failed first, stop and tell the user no reviewer could run.

Give every fallback's reason in the reviewer line, e.g. `Reviewer: gpt-5.6-sol · xhigh via Codex CLI (fallback: Opus spawn failed)`.

### Running the GPT fallback

- **Cursor and other harnesses that offer GPT models:** spawn the reviewer on your GPT 5.6 Sol model at xhigh effort.
- **Claude Code**, whose Agent tool only runs Claude models: run it through the Codex CLI, if `codex` is installed. For a GPT model the user asked for, swap in its name and effort. Write the brief to a file in a temp directory you can read (`<out>` below) and pass it on stdin, which avoids shell quoting:

  ```bash
  codex exec -m gpt-5.6-sol -c model_reasoning_effort="xhigh" -s read-only --json \
    -o "<out>/review.md" - < "<out>/brief.md" > "<out>/events.jsonl"
  ```

  `-s read-only` stops it from editing. The findings land in `review.md`. The first line of `events.jsonl` is a `thread.started` event; keep its `thread_id`. To re-review, write your message to a file and resume that thread, with every option before `resume`:

  ```bash
  codex exec -m gpt-5.6-sol -c model_reasoning_effort="xhigh" -s read-only --json \
    -o "<out>/review.md" resume <thread_id> - < "<out>/message.md" > "<out>/events.jsonl"
  ```

  If the new `thread.started` shows a different `thread_id`, Codex lost the earlier context: resend with a summary of earlier cycles. Don't pass `--ephemeral`, since ephemeral sessions can't be resumed. An xhigh review can take many minutes, so run it in the background. If the Bash sandbox blocks Codex's network access, run the same command, joined onto one line, with the terminal tool (`run_in_terminal`) and read the files once it's done. Without an installed, signed-in `codex`, the fallback can't run in Claude Code.

## Scope

Every decision stays in scope, and these rules outrank any finding:

- **In scope** means the branch's diff and its intent, narrowed by the user's focus if they gave one. Fix what the diff introduced or broke. A pre-existing bug the diff didn't touch goes in the report as out of scope; don't fix it.
- **Respect boundaries.** Fix at the layer the diff changed. No drive-by refactors, API reshaping, or moving logic into code another module owns. If the only correct fix is in someone else's code, report it instead of making it.
- **Lines of code don't matter; clarity does.** A plain, longer fix beats a clever short one.
- **Tests:** for each real bug you fix, add the simplest test that fails before the fix and passes after. Test observable behavior through the public interface, in the project's existing test style. Nits don't get tests.

## Procedure

1. **Spawn the reviewer** with a brief that tells it to:
   - Load the `adversarial-reviewer` skill before reviewing, if it's available.
   - Find the base (the branch's PR base, else the default branch) and review `git diff $(git merge-base HEAD <base>)`. Diffing against the working tree rather than `...HEAD` means later cycles see your uncommitted fixes. Weight the user's focus, if given.
   - Be ruthless. Assume bugs exist. No benefit of the doubt.
   - Return each finding with severity (blocker / major / minor / nit), `file:line`, why it matters, and the minimal fix, marking any pre-existing issue as such.
   - End with one verdict line: `CLEAN`, `NITS-ONLY` or `FINDINGS`.
   - Never edit files.

2. **Evaluate each finding.** Say briefly whether you agree and why.
   - Valid and in scope: fix it, with a test per the scope rules.
   - Invalid or already handled: note why.
   - Out of scope: record it for the report.
   - Nit: fix only if trivial and in scope; otherwise log it.

3. **Verify.** Run the project's relevant lint, typecheck and tests. A fix that breaks the build isn't a fix.

4. **Re-review with the same reviewer** so its context compounds: in Claude Code, SendMessage to its agent id, or `resume <thread_id>` for the Codex fallback; elsewhere, the harness's resume mechanism (e.g. a task id). Tell it which `file:line` you changed and which findings you rejected and why. Ask it to verify each fix, look for bugs the fixes introduced, and re-check anything it hasn't cleared. Ask it to verify, not to agree: don't claim the fixes are correct. If it can't be continued, spawn a fresh one with the same model and effort and a summary of earlier cycles.

5. **Repeat steps 2–4** until one of:
   - The verdict is `CLEAN`, or `NITS-ONLY` and you've decided which nits to skip.
   - You and the reviewer have disagreed on the same finding twice. Stop arguing and put both positions in the report for the user to decide.
   - Five cycles have run, unless the user asked for more. Report what's still open instead of looping on.

6. **Report:**
   - The reviewer used, and any fallback with its reason.
   - Cycles run and the final verdict.
   - Fixes made, each with its test.
   - Findings rejected, and why.
   - Nits left unfixed on purpose.
   - Out-of-scope findings, as follow-ups.

   If the first pass finds no bugs, summarize what was reviewed and why it holds up, plus any residual risk or testing gaps.

## Rules

- Track each cycle on the todo list, one item in progress at a time.
- Don't declare done until the reviewer's latest pass is clean or nits-only. If a stop condition ended the loop instead, say which.
- The reviewer only reviews. You make every change.
