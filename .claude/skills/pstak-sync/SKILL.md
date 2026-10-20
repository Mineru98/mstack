---
name: pstak-sync
description: "upstream(cursor/plugins의 pstack)에서 마지막 동기화 이후 바뀐 파일을 가져와 mstack에 맞게 이식한다. 개명, 3-way 병합, Cursor 전용 표현의 중립화, lint 검증, 기준선 갱신까지 한 번에 진행한다. 'pstack 동기화', 'upstream 반영', 'pstack 최신화', 'pstak-sync', 'sync pstack' 같은 요청에 쓴다."
---

# pstak-sync

upstream pstack의 최근 변경을 mstack에 안전하게 이식하는 유지보수용 스킬입니다. 플러그인 배포물이 아니라 이 저장소의 `.claude/skills`에서만 동작합니다.

## 왜 단계가 나뉘는가

mstack은 pstack을 개명만 한 포크가 아닙니다. upstream은 Cursor 전용 표현(`Task`, `AskQuestion`, `.cursor/`, `pstack-models.mdc`)으로 쓰여 있고, mstack은 이를 Claude Code와 Codex 겸용으로 다시 썼습니다. 그래서 정규식 치환만으로는 동기화할 수 없습니다. 작업은 두 층으로 나뉩니다.

| 층 | 담당 | 내용 |
| --- | --- | --- |
| 기계 | `scripts/pstack-sync.mjs` | upstream 가져오기, 변경 분류, 개명, 3-way 병합, 헤더 관리, lint |
| 의미 | 이 스킬을 실행하는 에이전트 | 충돌 해결, Cursor 표현 중립화, 수동 대상 검토, 검증 |

스크립트가 파일을 쓰는 경우는 자동 병합이 깨끗이 끝났을 때뿐입니다. 판단이 필요한 파일은 저장소를 건드리지 않고 작업 폴더에 자료만 준비합니다.

## 구성 파일

- `state.json`: 마지막으로 동기화한 upstream 커밋(`baseSha`)입니다. 이 값이 변경 범위의 시작점이며, 커밋 대상입니다.
- `sync.config.json`: 개명 규칙, 제외(`skip`)와 수동(`manual`) 경로, lint 규칙입니다. 규칙을 바꿀 때는 여기만 고칩니다.
- `references/adaptation-rules.md`: Cursor 표현을 mstack 표현으로 바꾸는 규칙표입니다. 의미 적응 단계에서 반드시 읽습니다.

## 절차

아래에서 `SYNC`는 `node .claude/skills/pstak-sync/scripts/pstack-sync.mjs`를 뜻합니다.

### 1. 현황 확인

```bash
SYNC status
```

변경이 없으면 "mstack은 최신 상태다"라고 알리고 끝냅니다. 변경이 있으면 분류별 개수와 upstream 버전 변화를 사용자에게 한 줄로 요약합니다. 처음 실행하는 환경에서는 upstream 저장소를 `~/.cache/mstack/pstack-sync/`에 받으므로 시간이 걸립니다.

### 2. 반영

작업 트리가 깨끗한지 먼저 확인합니다. 커밋되지 않은 변경이 있으면 스크립트가 중단하며, 그때는 사용자에게 커밋이나 stash를 요청합니다. `--allow-dirty`는 사용자가 명시적으로 허락했을 때만 씁니다.

```bash
SYNC apply
```

분류별로 스크립트가 하는 일은 다음과 같습니다.

| 상태 | 스크립트 동작 | 에이전트가 할 일 |
| --- | --- | --- |
| `clean` | 병합해서 파일에 씁니다. | 추가된 줄에 Cursor 표현이 섞이지 않았는지 3단계에서 확인합니다. |
| `added` | 개명과 `upstream:` 헤더를 붙여 새 파일을 씁니다. | 3단계에서 중립화합니다. |
| `renamed` | 로컬 파일을 새 경로로 옮기고 헤더를 갱신합니다. | 링크와 참조를 확인합니다. |
| `deleted` | 로컬이 원본과 같을 때만 삭제합니다. | 해당 파일을 가리키는 링크가 남았는지 확인합니다. |
| `conflict` | 저장소는 그대로 두고 `.merge`와 `.upstream.diff`를 만듭니다. | 4단계에서 직접 해결합니다. |
| `review` | 저장소는 그대로 둡니다. | 5단계에서 판단합니다. |
| `manual` | 저장소는 그대로 두고 upstream diff를 만듭니다. | 6단계에서 수동 반영합니다. |
| `skipped` | 아무것도 하지 않습니다. | 이유만 보고합니다. |
| `uptodate` | 아무것도 하지 않습니다. | 없습니다. |

작업 폴더 경로와 파일 목록은 `apply`의 출력과 `report.json`에 있습니다. 각 항목의 `commits`에 upstream 커밋 메시지가 들어 있으므로, 변경의 의도를 파악할 때 먼저 읽습니다.

### 3. Cursor 표현 중립화

`apply` 끝에 lint가 실행됩니다. 지적된 줄과 `clean`, `added` 파일의 추가된 줄을 `references/adaptation-rules.md`에 따라 고칩니다. 규칙표에 없는 표현은 먼저 `docs/harness/claude-code.md`와 `docs/harness/codex.md`에서 대응 행을 찾습니다. 없다면 추측하지 말고 6단계의 harness 문서 점검으로 넘깁니다.

### 4. 충돌 해결

각 `conflict` 항목마다 다음 순서로 합니다.

1. `.upstream.diff`에서 upstream이 무엇을 바꿨는지 읽습니다. 개명이 적용된 diff이므로 mstack 이름으로 보입니다.
2. `.merge`에서 `local`(mstack이 다시 쓴 문장)과 `upstream@head`(개명만 된 새 문장)를 비교합니다.
3. 저장소의 실제 파일을 직접 편집합니다. mstack의 중립 표현을 바탕으로 두고 upstream이 새로 도입한 의미만 반영합니다. `.merge` 파일을 저장소에 덮어쓰지 않습니다.
4. 파일 맨 위의 `upstream:` 헤더 줄은 그대로 둡니다.

### 5. 검토 항목

`review` 항목은 이유별로 다룹니다.

- 로컬에 없는 파일이 upstream에서 수정된 경우: mstack이 일부러 뺀 파일인지 먼저 확인합니다. 의도적으로 뺀 것이면 건너뛰고, 아니라면 `.upstream` 파일을 바탕으로 추가합니다.
- upstream이 삭제했지만 로컬이 수정되어 있는 경우: mstack이 고쳐 쓴 스킬을 지우는 일이므로 사용자에게 삭제 여부를 묻습니다. 임의로 지우지 않습니다.
- 바이너리가 바뀐 경우: mstack이 그 파일을 쓰는지 보고, 브랜딩이 들어간 이미지라면 복사하지 않습니다.
- 새 파일 경로에 다른 내용의 파일이 이미 있는 경우: 두 내용을 비교해 어느 쪽을 유지할지 결정하고, 판단이 어려우면 사용자에게 묻습니다.

### 6. 수동 대상

`README.md`와 `docs/harness/`는 병합하지 않습니다. 각 `.upstream.diff`를 읽고 mstack에 해당하는 변경만 직접 반영합니다.

- `README.md`: 새 스킬이나 플레이북이 생겼는지, 사용법 설명이 바뀌었는지 봅니다. 소개, 설치, 브랜딩 문구는 mstack 것을 유지합니다.
- `docs/harness/`: upstream이 도입한 새 도구, 필드, 경로가 있으면 `claude-code.md`와 `codex.md`에 대응 행을 함께 추가합니다. Codex에 대응이 없다면 "Features with no equivalent" 표에 넣습니다.

문서에 적힌 개수(플레이북 수 등)가 파일 추가와 삭제로 달라졌는지도 이 단계에서 맞춥니다.

### 7. 검증

아래를 모두 확인한 뒤에만 완료를 선언합니다. 실제 실행 결과를 근거로 삼습니다.

```bash
SYNC lint            # 통과해야 한다
SYNC audit           # 누락 파일, 낡은 헤더, 경로 불일치가 없어야 한다
git status --short   # 의도한 파일만 바뀌었는지 본다
```

- 충돌 표지(`<<<<<<<`)가 남은 파일이 없어야 합니다. lint가 함께 검사합니다.
- 스크립트(`skills/mineru-mode/scripts/`)가 바뀌었다면 해당 폴더에서 `bun run test`와 `bun run typecheck`를 실행합니다. 둘 다 `package.json`에 정의되어 있습니다.
- 바뀐 SKILL.md의 `name`이 폴더 이름과 같은지, 프런트매터가 깨지지 않았는지 확인합니다.
- 바뀐 문서의 상대 링크가 실제 파일을 가리키는지 확인합니다.
- 작성한 에이전트와 다른 에이전트(`reviewer`나 `verifier`)가 최종 diff를 읽는 검토를 한 번 거치는 편이 안전합니다. 같은 컨텍스트에서 스스로 승인하지 않습니다.

### 8. 기준선 갱신

모든 항목이 처리되고 검증이 끝난 뒤에만 기준선을 올립니다. 일부만 처리한 채 올리면 나머지 변경이 영구히 누락됩니다.

```bash
SYNC mark --to <apply 출력에 안내된 sha>
```

`state.json`이 바뀌면 사용자에게 알리고, 커밋은 사용자가 요청할 때만 만듭니다. 커밋 메시지는 이 저장소의 관례(한글, `chore(upstream): ...`)를 따르고 본문에 upstream 커밋 범위(`<base7>..<head7>`)를 적습니다.

## 하지 않는 일

- `plugin.json`, `.claude-plugin/`, `.codex-plugin/`, `.agents/`의 버전과 매니페스트를 upstream에 맞추지 않습니다. 버전 변화는 `status` 출력에서 참고만 합니다.
- `assets/`, `docs/guide/images/`, `LICENSE`, `.gitignore`를 덮어쓰지 않습니다(`sync.config.json`의 `skip`).
- upstream에 없는 사실, 수치, 출처를 문장을 매끄럽게 하려고 만들어 넣지 않습니다.
- 요청받지 않은 개선을 끼워 넣지 않습니다. 이식하는 변경 범위 밖의 문장은 고치지 않습니다.

## 옵션과 문제 해결

| 상황 | 방법 |
| --- | --- |
| 특정 커밋까지만 반영 | `SYNC apply --to <sha>` 후 같은 sha로 `mark` |
| `state.json`을 잃었거나 기준선이 의심스러움 | `SYNC audit --divergence`로 현재 트리가 upstream의 어느 시점과 맞는지 가늠하고, 확신이 생긴 sha로 `SYNC mark --to <sha>` |
| 기준선이 대상의 조상이 아니라는 오류 | upstream 히스토리가 다시 쓰였을 수 있습니다. 사용자에게 알리고, 새 기준선이 확실할 때만 `mark --force` |
| 다른 위치에 있는 사본을 대상으로 시험 | `--root <dir>`, `--upstream <url|path>`, `--cache <dir>`, `--base <sha>` |
| Cursor 표현이 아닌데 lint에 걸림 | 정상적인 사용이면 `sync.config.json`의 `lintAllow`에 경로와 규칙을 사유와 함께 추가 |
| 개명 규칙을 추가해야 함 | `sync.config.json`의 `pathRules`/`textRules`. 단어 경계에 주의합니다(`pstack`이 `upstack` 안에 들어 있어서 `(?<![A-Za-z])` 조건이 필요합니다). |
