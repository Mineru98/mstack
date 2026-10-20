# mstack in Codex

mstack skills name each tool once as a pair, such as "the subagent tool (`Agent` in Claude Code, `spawn_agent` in Codex)", then use the neutral phrase. In Codex, read this file once per session, then map each neutral phrase with the tables below. `<mstack>` means the folder that holds `skills/` and `docs/`. If a field has no row, drop it and say so. Never pass a field or value the tool schema rejects. Codex plugins ship no agents, so agent frontmatter does not apply.

## Tools

| Skill wording | Codex |
| --- | --- |
| the subagent tool | `spawn_agent` |
| the question tool | `request_user_input`. If it is absent, ask in plain text. |
| the todo list | `update_plan` |
| Run another mstack skill (`/name` or "the **name** skill") | Read `<mstack>/skills/<name>/SKILL.md` and follow it. When you tell the user to type it, write `$<name>`, or point them to the `/skills` picker. |
| plan mode | Codex plan mode (`/plan`). |
| skill authoring | `$skill-creator` |
| `/loop` | No built-in. Use Codex app Automations or a scheduled `codex exec`. |
| MCP servers | `codex mcp list` |

## Subagent fields

| Skill wording | Codex |
| --- | --- |
| general-purpose agent | The default agent. |
| read-only agent | A read-only sandbox, and the brief says "do not edit files". Check `git status` afterward. |
| writing agent | The default agent. |
| own git worktree and branch | `git worktree add`. Name the branch or commit the worker checks out. |
| local agent | Omit. |
| base branch `<b>` | Tell the worker to check out `<b>` first. |
| background run | Default. Subagents run in the background. |
| resume an agent | `send_input` to the live agent. If it is gone, spawn a new agent and paste the earlier result into its brief. |
| attached files | List the paths in the brief. |
| agent status | The Codex app thread list. |
| background agent frontmatter | None. |

## Models

| Skill wording | Codex |
| --- | --- |
| A role value `<model> <effort>` | The model id and `model_reasoning_effort` that `~/.codex/config.toml` or `/model` offer. Do not invent ids. |
| `inherit-parent` | Omit the model, so the agent runs on the session model. This is the default. |
| A slug the tool rejects | Use the skill's default, and say so. |
| The models rule | A block between `<!-- mstack-models:start -->` and `<!-- mstack-models:end -->` in `~/.codex/AGENTS.md`. Codex loads `AGENTS.md` into every new session, so the role lines are already in context. If they are not, read the block. If the block or the role's line is missing, use the skill's default. |

## setup-mstack

Follow its steps with these changes:

- Detect. The detected models are the model ids and reasoning efforts that `~/.codex/config.toml` and `/model` offer. Write a real model as `<model> <effort>`. The effort is the last token, so the budget step works as written.
- Defaults. A default of `inherit-parent` stays `inherit-parent`, unless you picked a Codex model in setup.
- Write. Replace only the block between the `mstack-models` markers in `~/.codex/AGENTS.md`, or append the block if the markers are absent. Put the comment lines, the `# budget` line, and one line per role inside it. Leave the rest of the file alone.

## Paths

| Skill wording | Codex |
| --- | --- |
| skills folders | `.agents/skills/`, `~/.agents/skills/` |
| plugin folders | `~/.codex/plugins/`, `.codex-plugin/plugin.json` |
| always-applied instructions | `AGENTS.md`. The models rule is a block in `~/.codex/AGENTS.md`. See Models. |
| enable the plugin in a repo | a plugin entry in `.codex/config.toml` |
| benny pack | `.mstack/automations/benny/`, `.mstack/benny/` |
| `https://github.com/Mineru98/mstack/blob/main/<path>` | `<mstack>/<path>` when that file exists. The plugin ships the skills, `docs/guide/`, and `README.md`. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| Transcripts | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`. The first line is `session_meta`, which holds `cwd`. Keep only rollouts whose `cwd` is this workspace, and do not read rollouts whose `cwd` is another workspace. |
| disk reclaim | `~/.codex` caches |

## Features with no equivalent

Codex has no routine runner for the benny pack, no built-in review bot, and no built-in PR tool. When a step needs one, put one line in your reply, `Skipped in Codex: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Skill wording | Codex |
| --- | --- |
| Automations: routines, state updates, webhooks, routine wakes, secret requests | Use Codex app Automations or a scheduled `codex exec` where the capability matches. Skip with the line when a step needs a precise API Codex lacks. |
| The automated PR review bot | Its comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures the bot when the PR has no bot check or comment. |
| Cloud agent, cloud VM | Maps to a git worktree, as in Subagent fields. Skip a step that needs a remote machine itself. |
| Sticky skill mode | None. Invoke `$mineru-mode` per task, or put a line in `AGENTS.md`. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. That is not a skip, so write no line. |
