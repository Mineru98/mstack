# Cursor 표현을 mstack 표현으로 바꾸는 규칙

upstream pstack은 Cursor 전용 표현으로 쓰여 있고, mstack은 같은 내용을 Claude Code와 Codex 겸용으로 다시 썼습니다. 이 문서는 mstack이 실제로 적용해 온 변환을 정리한 것입니다. 스크립트가 개명(pstack, poteto)까지 처리하므로, 여기서는 의미 적응이 필요한 항목만 다룹니다.

원칙은 세 가지입니다.

1. 도구 이름은 한 파일 안에서 처음 나올 때 짝으로 적습니다. 예: "the subagent tool (`Agent` in Claude Code, `spawn_agent` in Codex)". 이후에는 중립 표현 "the subagent tool"만 씁니다.
2. 이미 mstack이 다시 쓴 문장은 되돌리지 않습니다. 충돌이 나면 mstack 문장을 바탕으로 두고 upstream의 새 의미만 얹습니다.
3. 대응 개념이 없는 Cursor 기능은 지어내지 않습니다. 단계를 중립 표현으로 줄이거나, harness 문서의 "Features with no equivalent" 방식(`Skipped in <harness>: <step>. <reason>.`)을 따릅니다.

도구와 필드의 정답표는 `docs/harness/claude-code.md`와 `docs/harness/codex.md`입니다. 아래 표와 어긋나면 그 두 문서가 우선입니다.

## 도구 이름

| upstream (Cursor) | mstack 표현 |
| --- | --- |
| `Task` 도구, "Task subagent", "every `Task` call" | the subagent tool (`Agent` in Claude Code, `spawn_agent` in Codex). 이후에는 "subagent tool call", "subagent spawn". |
| `AskQuestion` | the question tool (`AskUserQuestion` in Claude Code, `request_user_input` in Codex). 없으면 평문으로 묻는다고 적는다. |
| todolist, "Open a todolist" | the todo list (`TodoWrite` in Claude Code, `update_plan` in Codex) |
| `create-skill` 스킬 | `skill-creator` (Codex에서는 `$skill-creator`) |
| `/loop` (Cursor 내장) | Claude Code 내장. Codex에는 없으므로 Codex app Automations나 예약된 `codex exec`를 안내한다. |

## 서브에이전트 필드

| upstream (Cursor) | mstack 표현 |
| --- | --- |
| `subagent_type: generalPurpose` | `subagent_type: "general-purpose"` (Claude Code), the default agent (Codex) |
| `readonly: true` | `subagent_type: "Explore"` (Claude Code) 또는 read-only sandbox (Codex), 그리고 브리프에 "do not edit files"를 넣는다. |
| `environment: "cloud"` | `isolation: "worktree"` (Claude Code) 또는 `git worktree add` 체크아웃 (Codex) |
| `environment: "local"` | 생략한다. |
| `cloud_base_branch: <b>` | "check out `<b>` first"를 브리프에 넣는다. |
| `run_in_background: true` | 배경 실행이 기본이므로 "Run in the background (the default)"로 적는다. |
| 에이전트 프런트매터 `is_background: true` | `background: true` (Claude Code 전용. Codex 플러그인은 에이전트를 싣지 않는다.) |
| cloud agent, cloud VM | worktree로 대응한다. 원격 머신 자체가 필요한 단계는 Skipped 줄로 처리한다. |

## 모델과 규칙 파일

| upstream (Cursor) | mstack 표현 |
| --- | --- |
| `~/.cursor/rules/pstack-models.mdc` | the `mstack-models` rule (`~/.claude/rules/mstack-models.md` in Claude Code, the marked block in `~/.codex/AGENTS.md` in Codex) |
| "always-applied rule" | "always-loaded rule" |
| 코드용 기본 모델 `grok-4.7-xhigh-fast` | `inherit-parent` |
| 글/판단용 기본 모델 `claude-opus-5-5-xhigh` 같은 전체 슬러그 | `opus xhigh` 형식 (`<model> <effort>`) |
| "If the Task tool rejects a slug" | "If the subagent tool rejects a slug" |

## 경로와 설치

| upstream (Cursor) | mstack 표현 |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.claude/skills/`, `~/.claude/skills/` (Claude Code), `.agents/skills/`, `~/.agents/skills/` (Codex) |
| `.cursor/settings.json`의 `plugins` | `.claude/settings.json`의 `enabledPlugins`/`extraKnownMarketplaces` (Claude Code), `.codex/config.toml`의 `[plugins."mstack@ax"]` (Codex) |
| `.cursor/automations/benny/`, `.cursor/benny/` | `.mstack/automations/benny/`, `.mstack/benny/` |
| `~/.cursor/projects/*/agent-transcripts/` | Claude Code는 `~/.claude/projects/<slug>/<session>.jsonl`, Codex는 `cwd`가 이 작업 공간인 `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` |
| `/add-plugin mstack` | `/plugin marketplace add Mineru98/mstack`와 `/plugin install mstack@ax` (Claude Code), `codex plugin marketplace add Mineru98/mstack` (Codex) |
| 설치 확인 문구 "Cursor confirms..." | 하네스 중립 문구 또는 Claude Code 접두사 안내 (`/mstack:<name>`) |

## 제품과 외부 스킬

| upstream (Cursor) | mstack 표현 |
| --- | --- |
| Bugbot | the PR review bot (파일명 `bugbot-triage.md`와 상호 참조 경로는 그대로 둔다) |
| "Cursor's built-in babysit skill" | "any built-in babysit skill" |
| `cursor-team-kit`의 `/deslop` | `unslop` 스킬과 no-comments, 그리고 plain-words pass (narrating comment, unsupported guard, dead compatibility path, unrelated edit 제거) |
| `control-cli`, `control-ui` (cursor-team-kit) | "UI/CLI를 조작하는 스킬을 repo나 harness가 제공하면 그것" (Claude Code는 Chrome/Playwright MCP, Codex는 browser 또는 computer use) |
| "restart Cursor", "In a Cursor chat" | "restart the harness", "In Claude Code" 또는 "In Codex" |

## 판단이 필요한 경우

- upstream이 새 Cursor 도구, 필드, 경로를 도입했는데 위 표에 없으면, 먼저 `docs/harness/`에 대응 행이 있는지 봅니다. 있으면 그 표현을 쓰고, 없으면 대응 개념이 실제로 있는지 확인한 뒤 harness 문서 두 개에 행을 함께 추가합니다. 확인되지 않은 대응을 추측해 적지 않습니다.
- 가이드의 이미지 대체 텍스트처럼 mstack이 자산을 따로 만든 곳은 upstream 문구를 그대로 가져오지 않습니다. 이미지 파일은 동기화 대상이 아니므로 대체 텍스트는 mstack 이미지에 맞는 현재 문구를 유지합니다.
- 문서에 적힌 개수(플레이북 수, 스킬 수)는 파일을 추가하거나 삭제한 뒤에 실제 개수와 맞춥니다. 현재 플레이북 수는 `ls skills/mineru-mode/playbooks | wc -l`로 셉니다.
- `upstack`(스택 PR의 위쪽 PR을 가리키는 용어), 페이지네이션 변수 `cursor`, 텍스트 커서를 뜻하는 "cursor location"은 Cursor 제품과 무관하므로 바꾸지 않습니다.
