---
name: setup-mstack
description: Configure which models mstack uses per role and at what reasoning budget. Detects your available models and writes an always-loaded rule that overrides the skill defaults, in Claude Code or Codex. Use for /setup-mstack, "configure mstack models", "mstack budget", or changing mstack's model choices.
---

# Setup mstack

Write the `mstack-models` rule, an always-loaded rule that sets mstack's model per role. In Claude Code it is `~/.claude/rules/mstack-models.md` (no frontmatter). In Codex it is a block between `<!-- mstack-models:start -->` and `<!-- mstack-models:end -->` in `~/.codex/AGENTS.md`.

## Steps

### 1. Detect available models

Enumerate the models the subagent tool accepts in this session. That is the dependable source. In Claude Code, read the `model` values in the `Agent` tool schema (slugs such as `opus`, `sonnet`, `haiku`, `fable`; effort `low|medium|high|xhigh|max`). In Codex, read the models and `model_reasoning_effort` values in `~/.codex/config.toml` or offered by `/model`; do not invent ids. If you cannot detect any, ask the user to paste the slugs they have access to. Never write a real slug you have not confirmed is available. The aliases `inherit-parent` and `auto` are always valid even though they are not detected slugs.

### 2. Load current state

The default role-to-model mapping is the rule shape shown in step 5 below. If the rule already exists (the file in Claude Code, the marked block in Codex), read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A line whose role is not in step 5, such as `how critics`, is from a retired role. Drop it.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer `AskUserQuestion` (`request_user_input` in Codex; a plain-text question if absent) over free text. Offer these four options with these exact labels, and name the current budget when the rule records one. With no rule, say that `large` matches the skill defaults.

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by family, list, or alias (`inherit-parent`, `auto`). `unlimited`, `large`, `medium`, and `small` set the effort token of every real slug, panel entries included, to `max`, `xhigh`, `high`, or `medium`. The effort token is the last token on the ladder `max` > `xhigh` > `high` > `medium` > `low`. If the result is not a detected slug, use the same family's detected slug with the highest effort at or below the target, else mark the role as needing a choice. `inherit-parent` and `auto` do not change. So `unlimited` turns `opus xhigh` into `opus max`. `large` keeps the defaults. `small` turns `opus xhigh` into `opus medium`. If the harness offers no such effort for that model, use the highest it offers at or below the target.

**(c) Show the roles and confirm.** Show every role with its model, marking any real slug not in the detected set as needing a choice. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected models plus `inherit-parent` and `auto` (both mean: this role runs on the parent chat model, which is how Auto users stay on Auto) as the options. Prefer `AskUserQuestion` (`request_user_input` in Codex) over free text. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena selects one value from it whose model family differs from the parent's when possible. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every real model written must be in the detected set. `inherit-parent` and `auto` always pass. If a chosen real slug is not available, stop and ask again.

### 5. Write the rule

Write the rule (Claude Code: `~/.claude/rules/mstack-models.md`; Codex: replace the marked block in `~/.codex/AGENTS.md`, or append it if absent, leaving the rest of the file alone), a `# budget` line with the chosen label and its target effort, and one line per role, using the same labels mineru-mode uses. Overwrite the whole file (Claude Code) or the whole block (Codex) so re-runs stay idempotent. Each value is `<model> <effort>` or `inherit-parent`. In Codex, wrap the lines in `<!-- mstack-models:start -->` and `<!-- mstack-models:end -->`, and replace each `opus xhigh` below with the Codex model and effort the user picked, or `inherit-parent`. Shape:

```
# mstack model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit the subagent tool's `model`). Alias entries in a panel list still count toward its fan-out.
# budget: large (xhigh)
feature, refactoring: inherit-parent
bug-fix: inherit-parent
perf-issue: inherit-parent
hillclimb: inherit-parent
judgment and prose: opus xhigh
hardest tasks: opus xhigh
how explorer: inherit-parent
how explainer: opus xhigh
why investigators: inherit-parent
why synthesizer: opus xhigh
reflect tooling: inherit-parent
reflect judgment, divergent, synthesizer: opus xhigh
arena runners: opus xhigh, inherit-parent
arena cross-judge pool: opus xhigh, inherit-parent
swarm workers: inherit-parent
architect runners: opus xhigh, inherit-parent
interrogate reviewers: opus xhigh, inherit-parent
```

### 6. Confirm

Tell the user the rule was written and that it applies to new sessions (a harness restart may be needed). Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill` (resolves wherever mstack is installed: workspace, user, or plugin). On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, invoke `/create-formal-verification-skill` (resolves wherever mstack is installed: workspace, user, or plugin). On no, move on without pushing.
