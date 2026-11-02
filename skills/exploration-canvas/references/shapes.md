# Shapes: starting points, not templates

A canvas takes its shape from the material and what it's for. These are shapes that have worked for common jobs. Take the parts that fit, merge branches that would be thin, add the angle this topic needs, and drop the rest. If none fits, design your own from the rule underneath them all: the core is the topic, each branch is one angle, each board makes one point, and the order reads well when walked with →.

## Contents

- [Learn from a video or lecture](#learn-from-a-video-or-lecture)
- [Learn from an article or paper](#learn-from-an-article-or-paper)
- [Brainstorm an idea](#brainstorm-an-idea)
- [Compare design directions](#compare-design-directions)
- [Explain a system or codebase](#explain-a-system-or-codebase)
- [Make a decision](#make-a-decision)
- [Mixing shapes](#mixing-shapes)

## Learn from a video or lecture

For: understanding and remembering what a talk says, then going a bit further.

- **Core:** the talk's main idea in one line, `media: video()`, and meta chips for the speaker, length and date. Use the source's brand color as the accent when it has one.
- **Layout:** `"right"` when the talk builds step by step and the order matters; `"balanced"` when it covers several parallel ideas.

| Branch | Boards and pieces |
| --- | --- |
| The gist | What it says in a few sentences (`prose` + `note` "insight"); the two or three lines that carry it (`quote` with `t`) |
| The path | The chapters as a `timeline` with timestamps, each with one sentence on what it adds |
| Key ideas | One board per idea, in the talk's own order. The mechanism as `steps` when it has stages; a `flow` when it's a pipeline. Each quote and claim keeps its timestamp |
| See it work | A `demo` for any idea with a knob: the viewer moves the knob and watches the effect the talk describes. Say so if the numbers are illustrative |
| Connections | `badge: "Beyond the video"`: where it comes from, what it's related to, an analogy, a common misreading |
| Questions | What the talk leaves open, simplifies or skips (`stickies` or `note` "question"), clearly marked as yours |
| Test yourself | `flips` for the terms, a `quiz` of 3–5 questions whose `why` cites the timestamp |

Long talks (over an hour): one branch per part, each with its own gist, ideas and timeline, and the quiz at the end.

## Learn from an article or paper

For: getting the argument, the method and the evidence without reading every page.

- **Core:** the claim in one line, the title, the authors and year, and a link (`source: { url }`).

| Branch | Boards and pieces |
| --- | --- |
| The claim | What the paper says it shows, and why that matters (`prose`, `note`) |
| Background | The problem before this work and the terms you need (`flips` work well here) |
| The method | How it works, as `steps` or a `flow`; the key equation explained a term at a time with `steps` |
| The evidence | The headline numbers (`stats`, with units and the page or table they come from), a `table` of comparisons, a `line` or `bars` redrawn from reported values |
| Play with it | A `demo` of the core mechanism, with the paper's own parameters where it gives them |
| Limits and critiques | `badge: "Beyond the paper"` where it's yours: assumptions, what it didn't test, what later work found |
| Test yourself | A `quiz` |

## Brainstorm an idea

For: turning one rough idea into angles, options and a next step.

- **Core:** the idea in the user's words, and the question it answers ("How might we…").
- **Layout:** `"balanced"`: understanding on the left, possibilities on the right.

| Branch | Boards and pieces |
| --- | --- |
| The problem | Who has it, when, and what they do today (`prose`, `quote` from real users if there are any) |
| What exists | Prior art and competitors (`table`, or `stickies` by kind), with what each gets right |
| Constraints | Time, money, skills and the assumptions you made (`note` "warn" for the risky ones) |
| Angles | Many raw ideas as `stickies`, colored by theme. Go wide here: 9–15 notes |
| Directions | The 3–4 strongest angles, one board each: what it is, who it's for, what it would take, the biggest risk |
| Where they sit | A `matrix` (effort against payoff, or risk against reward), and a `demo` with weight sliders ranking the directions with `bars` |
| Next steps | The cheapest test for the top direction, as a `flow` or a short checklist, plus open questions |

## Compare design directions

For: choosing a visual or product direction with the options side by side and in context.

- **Core:** the design question and where the result ships; `media` can be the current state.
- Read the real product first (its tokens, components and copy) so every mock matches production. Build directions as live HTML, CSS and SVG in the page, never as screenshots of something else.

| Branch | Boards and pieces |
| --- | --- |
| Brief | The ask, the constraints, what done looks like (`prose`, `code` for specs) |
| References | What already exists, rebuilt so the references sit side by side (`grid` of `fig`) |
| Anatomy | What the thing is made of, as `steps` that build it up a layer at a time |
| Directions | One board per direction with 2–4 live variations each (`grid`, `fig`), and a `seg` to switch a variable across all of them |
| Details | Type, color (`swatches`), icons and states at full size |
| In context | Each direction on the real page or screen, with a light/dark `seg` |
| Motion | How it moves, if it moves: a `demo` with a speed slider, or a `steps` sequence |

## Explain a system or codebase

For: building a mental model of how something works before changing it.

| Branch | Boards and pieces |
| --- | --- |
| What it does | The system in one paragraph and the job it does for its users |
| The parts | The main components as a `flow` (or hand-drawn SVG for anything that isn't a line), each with what it owns |
| A request's journey | One real operation traced end to end with `steps`, naming the files and functions at each stop (`code` for the key lines) |
| Data | The core data structures and where they live (`table`, `code`) |
| Edges | Failure modes, limits and gotchas (`note` "warn") |
| Where to start | The files to read first and the change you'd make, as a short `timeline` |

## Make a decision

For: choosing between a few options with the reasoning visible.

| Branch | Boards and pieces |
| --- | --- |
| The decision | What's being decided, by when, and what happens if nothing is |
| Options | One board per option: what it is, cost, risk, what it unlocks |
| Criteria | What matters and how much, as a `demo` with a weight slider per criterion and the ranked options in `bars` |
| Trade-offs | A `matrix` and a `table` of each option against each criterion |
| Recommendation | The pick, why, what would change your mind, and the first step |

## Mixing shapes

Real topics mix these. A lecture on a design system is "learn from a video" with a "compare directions" branch; a paper you might build on is "learn from a paper" followed by "brainstorm". Merge branches that would hold a single thin board, and split a branch whose boards make two different points. Six strong branches beat ten thin ones.
