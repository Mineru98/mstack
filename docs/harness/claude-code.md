# mstack in Claude Code

mstack skills name each tool once as a pair, such as "the subagent tool (`Agent` in Claude Code, `spawn_agent` in Codex)", then use the neutral phrase. In Claude Code, read this file once per session, then map each neutral phrase with the tables below. `<mstack>` means the folder that holds `skills/` and `docs/`. If a field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

## Tools

| Skill wording | Claude Code |
| --- | --- |
| the subagent tool | `Agent` |
| the question tool | `AskUserQuestion`. In `-p` mode it is absent, so ask in plain text. |
| the todo list | `TodoWrite` if the session offers it. Otherwise keep the list in your reply and update it at each phase. |
| Run another mstack skill (`/name` or "the **name** skill") | `Read` `<mstack>/skills/<name>/SKILL.md` and follow it. The `Skill` tool refuses most mstack skills. When you tell the user to type it, write `/mstack:<name>`. |
| `Grep`, `Glob` | `Bash` with `rg` when the session has no `Grep` or `Glob`. |
| plan mode | Claude Code plan mode. |
| skill authoring | the `skill-creator` skill. |
| `/loop` | `/loop`, built in. |
| MCP servers | `claude mcp list`, or the session's tool list. |

## Subagent fields

| Skill wording | Claude Code |
| --- | --- |
| general-purpose agent | `subagent_type: "general-purpose"` |
| `mineru-agent`, `comment-sicko` | `mstack:mineru-agent`, `mstack:comment-sicko` |
| read-only agent | `subagent_type: "Explore"`. It keeps `Bash`, so the brief also says "do not edit files", and you check `git status` afterward. |
| writing agent | `general-purpose`. It keeps the session's MCP servers. |
| own git worktree and branch | `isolation: "worktree"`. Name the branch or commit the worker checks out. |
| local agent | Omit. |
| base branch `<b>` | Tell the worker to check out `<b>` first. |
| background run | Omit. Subagents run in the background by default and notify you when they finish. |
| resume an agent | Spawn a new agent and paste the earlier result into its brief. |
| attached files | List the paths in the brief. |
| agent status | The background task list, or `/tasks`. |
| background agent frontmatter | `background: true`. |

## Models

| Skill wording | Claude Code |
| --- | --- |
| A role value `<model> <effort>`, such as `opus high` | `model: "opus"` and `effort: "high"`. `model` takes only `opus`, `sonnet`, `haiku`, `fable`. Effort is `low`, `medium`, `high`, `xhigh`, or `max`. |
| `inherit-parent` | Omit `model`, so the agent runs on the session model. |
| A slug the tool rejects | Use the skill's default, and say so. |
| The models rule | `~/.claude/rules/mstack-models.md`. Claude Code loads it into every new session, so its role lines are already in context. If they are not, read the file. If the file or the role's line is missing, use the skill's default. |

## setup-mstack

Claude Code loads every `.md` file in `~/.claude/rules/` into each new session, so `setup-mstack` writes its rule there. Follow its steps with these changes:

- Detect. The detected models are the `model` values that the `Agent` tool schema lists, each with an effort from its `effort` values. Write a real model as `<model> <effort>`, such as `opus xhigh`. The effort is the last token, so the budget step works as written.
- Defaults. A default of `inherit-parent` stays `inherit-parent`.
- Write. Write `~/.claude/rules/mstack-models.md` with no frontmatter, then the comment lines, the `# budget` line, and one line per role. Overwrite the whole file. Never put the role lines in `CLAUDE.md`.

## Paths

| Skill wording | Claude Code |
| --- | --- |
| skills folders | `.claude/skills/`, `~/.claude/skills/` |
| plugin folders | `~/.claude/plugins/`, `.claude-plugin/plugin.json` |
| always-applied instructions | `CLAUDE.md`. The models rule is the exception. See Models. |
| enable the plugin in a repo | `enabledPlugins` in `.claude/settings.json` |
| benny pack | `.mstack/automations/benny/`, `.mstack/benny/` |
| `https://github.com/Mineru98/mstack/blob/main/<path>` | `<mstack>/<path>` when that file exists. The plugin ships the skills, `docs/guide/`, and `README.md`. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| Transcripts | `~/.claude/projects/<slug>/<session>.jsonl`. The slug is the workspace path with each `/` and `.` changed to `-`, so `/Users/you/proj` is `-Users-you-proj`. The newest `.jsonl` directly in that folder is the current session. Its `<session>/subagents/` folder holds subagent transcripts. Read only this workspace's folder, and do not glob across `~/.claude/projects/*/`. |
| disk reclaim | `~/.claude` caches |

## Features with no equivalent

Claude Code has no automation pack runner, no built-in review bot, and no built-in PR tool. When a step needs one, put one line in your reply, `Skipped in Claude Code: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Skill wording | Claude Code |
| --- | --- |
| Automations: routines, state updates, webhooks, routine wakes, secret requests | Use routines (`/schedule`) with a trigger URL where the capability matches. Skip with the line when a step needs a precise API Claude Code lacks. |
| The automated PR review bot | Its comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures the bot when the PR has no bot check or comment. |
| Cloud agent, cloud VM | Maps to a worktree, as in Subagent fields. Skip a step that needs a remote machine itself. |
| Sticky skill mode | None. Re-invoke `/mstack:mineru-mode` at each new task, or put a line in `CLAUDE.md`. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. That is not a skip, so write no line. |
