<!-- upstream: https://github.com/cursor/plugins/blob/main/pstack/README.md -->
# mstack

mstack은 claude code와 codex에서 쓰는 엄격한 에이전트 워크플로 모음입니다. [mineru](https://github.com/Mineru98)의 작업 방식인 "코드는 적게, 품질은 높게"를 바탕으로 만들었습니다.

요즘 AI가 슬롭(slop) 코드, 곧 대충 찍어낸 저품질 코드를 너무 많이 쓴다는 말이 늘었습니다. 저도 동의합니다. 슬롭 장인 스무 명이 있는 팀처럼 배포하고 싶지는 않습니다. 품질 없는 처리량은 제가 바라는 목표가 아닙니다. 빨리 가고 싶다면 먼저 깊이 파고드세요.

**mstack은 이 문제에 제가 내놓은 답입니다.** 저는 매일 이 스킬로 품질 높은 코드를 배포합니다. mstack을 쓰면 에이전트 하네스(harness)가 진짜 엔지니어링 팀처럼 움직입니다. 목표는 LOC를 늘리는 것이 아닙니다. 오히려 정반대입니다. 더 적은 코드로 더 높은 품질을 내도록 돕습니다.

**mstack은 걱정 없는 병렬 작업을 가능하게 합니다.** 에이전트 하나를 깊이 파고들게 해서 믿을 만하고 검증 가능한 코드를 얻을 수 있다면, 안심하고 병렬로 돌릴 수 있습니다. `mineru-mode`로 에이전트를 여러 개 띄우면 각자 엄격한 엔지니어링 원칙을 지켜 일합니다.

**mstack은 모델별 강점을 모두 살립니다.** 최신 모델마다 강점과 약점이 다릅니다. mstack은 어떤 모델과도 함께 쓸 수 있고, 제 스킬 상당수는 여러 모델의 장점을 조합하는 멀티 모델 워크플로를 씁니다.

포크해서 마음껏 고치고 자기 것으로 만드세요. PR도 환영합니다!

## 설치

claude code:

```bash
/plugin marketplace add Mineru98/mstack
/plugin install mstack@ax
```

codex:

```bash
codex plugin marketplace add Mineru98/mstack
```

그다음 플러그인 디렉터리(`/plugins`)에서 `mstack`을 설치합니다.

claude code는 플러그인 명령과 에이전트 앞에 플러그인 이름을 붙이므로 `/mineru-mode`는 `/mstack:mineru-mode`가 됩니다. codex에서는 `$mineru-mode`나 `/skills` 선택기로 스킬을 호출합니다. 스킬 문서에는 두 하네스를 함께 다루는 표현이 있는데, 각각 어떻게 읽어야 하는지는 [claude code 참고 문서](./docs/harness/claude-code.md)와 [codex 참고 문서](./docs/harness/codex.md)에 적혀 있습니다. claude code에서 `/mstack:setup-mstack`을 실행하면 모델 선택이 `~/.claude/rules/mstack-models.md`에 저장됩니다. codex에서는 `$setup-mstack`이 `~/.codex/AGENTS.md`의 표시된 블록에 저장합니다. 하네스가 지원하지 않는 기능이 필요한 단계는 한 줄 안내만 남기고 건너뜁니다.

## 시작하기

두 단계면 됩니다.

1. [`/setup-mstack`](./skills/setup-mstack/SKILL.md)을 실행해 추론 예산(reasoning budget)을 고르고 쓸 모델을 선택합니다.
2. 엄격함이 필요한 작업을 할 때마다 [`/mineru-mode`](./skills/mineru-mode/SKILL.md)를 씁니다.

처음이라면 [mstack 가이드](./docs/guide/README.md)를 보세요. 설정과 프롬프트 작성부터 검증, 밤샘 실행까지 실제 작업 하나를 따라가며 설명합니다. 막혔거나 어떤 스킬이 맞는지 모르겠다면 [`/mineru-help`](./skills/mineru-help/SKILL.md)에 물어보세요.

이게 전부입니다. 나머지 스킬은 상황에 따라 쓰는 것들이고, 필요하면 mode 스킬이 알아서 불러 줍니다. 기본 상태에서는 모든 역할이 부모 세션의 모델을 그대로 씁니다(`inherit-parent`). 그래서 서브에이전트도 이미 고른 모델로 돌아갑니다. 바꾸고 싶으면 [`/setup-mstack`](./skills/setup-mstack/SKILL.md)에서 고치면 됩니다.

## 사용법

작업을 시작할 때 [`/mineru-mode`](./skills/mineru-mode/SKILL.md)를 씁니다. 요청을 읽고 플레이북([playbook](https://github.com/Mineru98/mstack/tree/main/skills/mineru-mode/playbooks)) 중 맞는 것을 고른 다음, 각 단계에 필요한 다른 스킬을 알아서 실행합니다.

작업 내용을 입력하기 전에 `/mineru-mode`(codex에서는 `$mineru-mode`)를 먼저 호출하세요. 그래야 하네스가 스킬을 메시지에 붙입니다.

### 그냥 [`/mineru-mode`](./skills/mineru-mode/SKILL.md)를 쓰세요

이 스킬이 가장 쉬운 지름길입니다. 저는 에이전트가 엄격하게 일해야 할 때마다 이걸 씁니다. 플레이북은 스물세 개입니다.

```
/mineru-mode 이 PR에 버그가 있어요. 가만히 두어도 750ms마다 스크롤이 밀립니다. 먼저
재현하고, 고친 다음 검증해 주세요.
```

```
/mineru-mode 저는 자러 갑니다. CI가 불안정해도 스택을 머지해 주세요. 아침까지 전부
머지되어 있으면 좋겠습니다.
```

<details>
<summary>플레이북 스물세 개</summary>

| 플레이북 | 용도 |
|---|---|
| [investigation](./skills/mineru-mode/playbooks/investigation.md) | 읽기 전용 질문. x는 어떻게 동작하는지, y는 왜 이렇게 만들었는지, 확실한지 알아봅니다. |
| [bug fix](./skills/mineru-mode/playbooks/bug-fix.md) | 결함을 재현하고 근본 원인을 찾아, 런타임 증거로 확인하며 고칩니다. |
| [perf](./skills/mineru-mode/playbooks/perf-issue.md) | 측정된 느려짐을 추적하고 기준선(baseline)과 비교해 개선합니다. |
| [hillclimb](./skills/mineru-mode/playbooks/hillclimb.md) | 지표 하나를 목표치까지 과학적으로 꾸준히 끌어올립니다. 가설을 세우고 전후를 측정하는 과정을 반복하며, 개선이 받아들여질 때마다 커밋 하나를 남깁니다. |
| [runtime forensics](./skills/mineru-mode/playbooks/runtime-forensics.md) | 지금 일어나는 증상(메모리 누수, 유휴 상태 CPU 폭주, 화면 깨짐)을 계측 데이터로 진단합니다. |
| [trace forensics](./skills/mineru-mode/playbooks/trace-forensics.md) | 이미 수집한 프로파일링 결과물(cpuprofile, trace, spindump, heap snapshot)을 진단합니다. |
| [feature](./skills/mineru-mode/playbooks/feature.md) | 새 동작이나 바뀐 동작을, 이름 붙인 데이터 형태에서 출발해 만듭니다. |
| [refactoring](./skills/mineru-mode/playbooks/refactoring.md) | 동작은 그대로 두고 구조나 형태만 바꿉니다. |
| [prototype](./skills/mineru-mode/playbooks/prototype.md) | 버릴 스케치를 만들어 설계나 동작에 관한 결정을 싸게 내리거나, 직접 관찰해서 실험적인 갈림길을 정리합니다. |
| [visual parity](./skills/mineru-mode/playbooks/visual-parity.md) | 두 구현의 UI를 픽셀 단위로 똑같이 맞춥니다. |
| [authoring a skill](./skills/mineru-mode/playbooks/authoring-a-skill.md) | SKILL.md를 새로 쓰거나 고칩니다. |
| [eval](./skills/mineru-mode/playbooks/eval.md) | 스킬이나 프롬프트를 바꿨을 때 에이전트 동작이 어떻게 달라지는지 블라인드로 테스트합니다. |
| [babysit](./skills/mineru-mode/playbooks/babysit.md) | PR 하나 또는 스택을 머지 가능한 상태까지 끌고 갑니다. 충돌, 리뷰 스레드, CI를 처리합니다. |
| [shipping](./skills/mineru-mode/playbooks/shipping.md) | 초록불인 스택을 독립적으로 검증한 뒤, 검증된 연속 구간을 아래부터 차례로 머지합니다. 기본은 github를 통하고, origin을 쓸 수 있으면 origin을 씁니다. |
| [autonomous run](./skills/mineru-mode/playbooks/autonomous-run.md) | 오래 걸리는 작업을 멈추지 않고 끝까지 진행합니다. |
| [orchestrate](./skills/mineru-mode/playbooks/orchestrate.md) | 조율 담당 채팅 하나에 맡기는 장기 프로젝트. 며칠에 걸치고, 스택된 PR이 많고, 서브에이전트 여러 대가 동원됩니다. |
| [autopilot-full](./skills/mineru-mode/playbooks/autopilot-full.md) | 서로 독립적인 PR들을 PR마다 담당자 한 명씩 두고 머지까지 진행합니다. 스웜(swarm)이 코드가 준비된 각 head를 검증하고, 패치를 다시 바꾸면 새로 검사합니다. |
| [autopilot-stack](./skills/mineru-mode/playbooks/autopilot-stack.md) | 선형 base-branch 스택 하나를 만들고 검증해서, 운영자가 검토하고 머지할 수 있게 넘깁니다. |
| [session pickup](./skills/mineru-mode/playbooks/session-pickup.md) | 이전 에이전트가 하던 작업을 이어받거나 인수합니다. |
| [pause safely](./skills/mineru-mode/playbooks/pause-safely.md) | 진행 중인 작업을 깔끔하게 멈춰서 나중에 다시 시작할 수 있게 합니다. |
| [multi-phase plan](./skills/mineru-mode/playbooks/multi-phase-plan.md) | 여러 단계나 스택된 PR에 걸치는 작업. |
| [worktree cleanup](./skills/mineru-mode/playbooks/worktree-cleanup.md) | 머지됐거나 버려진 worktree와 오래된 iOS 시뮬레이터를 정리해 디스크를 되찾습니다. 안전 점검을 통과한 것만 지웁니다. |
| [opening a pr](./skills/mineru-mode/playbooks/opening-a-pr.md) | 작고 순서가 정해진 커밋으로 ready 상태의 PR을 엽니다. 제목은 conventional commits 형식, 본문은 브리핑 형식입니다. 다른 모든 플레이북의 마지막에 호출됩니다. |

</details>

호출하면 다음 순서로 진행합니다.

1. 작업에 맞는 [플레이북](./skills/mineru-mode/playbooks/)을 찾아, 그 단계를 그대로 옮겨 적은 todo 목록을 엽니다.
2. 단계마다 필요한 다른 스킬을 불러 실행합니다.
3. 받는 사람과 유지보수하는 사람의 입장에 맞춰, 슬롭을 걷어낸 답변을 씁니다.

전체 규칙과 플레이북은 [`skills/mineru-mode/SKILL.md`](./skills/mineru-mode/SKILL.md)에 있습니다.

claude code와 codex 모두 모드를 유지하는 기능은 없습니다. [`/mineru-mode`](./skills/mineru-mode/SKILL.md)를 계속 켜 두려면 새 작업마다 다시 호출하세요(claude code는 `/mstack:mineru-mode`, codex는 `$mineru-mode`). 또는 `CLAUDE.md`(claude code)나 `AGENTS.md`(codex)에 이 스킬을 쓰라는 한 줄을 넣어도 됩니다.

[`/mineru-mode`](./skills/mineru-mode/SKILL.md)는 claude code 내장 `/loop` 명령과 특히 잘 맞습니다. codex에는 내장 loop가 없으니 codex 앱 automations나 예약한 `codex exec`를 쓰세요. 엄격함을 잃지 않으면서 에이전트를 몇 시간씩 일하게 할 수 있습니다.

## 스킬

[`/mineru-mode`](./skills/mineru-mode/SKILL.md)는 아래 스킬 대부분을 단계가 필요로 할 때 알아서 실행합니다(`how`, `why`, `architect`, `arena`, `swarm`, `interrogate`, `unslop`, `no-comments`, `technical-writing`, `tdd`, 그리고 원칙들). 아래 표는 스킬 하나를 직접 쓰고 싶을 때 참고하세요.

```
/how 실행 취소는 어떻게 동작해? 취소할 run을 하나씩 조회하면서 n+1 문제가 생기지는 않아?
```

```
/interrogate 이 PR을 리뷰해 줘.
```

<details>
<summary>전체 스킬</summary>

| 스킬 | 이럴 때 씁니다 |
|---|---|
| [`/mineru-mode`](./skills/mineru-mode/SKILL.md) | 간단하지 않은 모든 작업의 기본 진입점. |
| [`/mineru-help`](./skills/mineru-help/SKILL.md) | mstack이 처음이거나, 어떤 스킬·플레이북·원칙이 맞는지 모를 때. 하려는 일을 먼저 파악하고 그 부분에 답한 뒤, 입력할 프롬프트를 건네줍니다. `/mineru-help`를 직접 입력할 때만 실행됩니다. |
| [`/in-your-own-words`](./skills/in-your-own-words/SKILL.md) | 에이전트가 작업에 들어가기 전에 목표와 문제를 자기 말로 다시 설명해 주길 원할 때. `/in-your-own-words`를 직접 입력할 때만 실행됩니다. |
| [`/sharpen`](./skills/sharpen/SKILL.md) | 프롬프트를 보내기 전에 더 길게가 아니라 더 깊게 만들고 싶을 때. 이 스킬은 네 가지를 짚어 줍니다. 최고 전문가라면 요청하지 않은 일까지 무엇을 하는지, 출발점으로 삼을 원재료가 무엇인지, 어떤 방법과 도구를 쓰는지, 결과가 맞는지 확인할 외부 검증이 무엇인지입니다. 다시 쓴 프롬프트를 돌려주며 선택은 사용자에게 남겨 둡니다. 작업 자체는 하지 않습니다. `/sharpen`을 직접 입력할 때만 실행됩니다. |
| [`/how`](./skills/how/SKILL.md) | 어떤 서브시스템이 어떻게 동작하는지 차근차근 알고 싶을 때. |
| [`/why`](./skills/why/SKILL.md) | 무언가가 왜 이렇게 만들어졌는지 알고 싶을 때. 실행 시점에 사용 가능한 MCP를 찾아, 증거 범주별로(소스 관리, 이슈 트래커, 장문 문서, 실시간 채팅, 인프라 관측, 에러 추적, 분석 웨어하우스) 병렬로 조회합니다. |
| [`/recall`](./skills/recall/SKILL.md) | 작업을 시작하거나 재개하면서 어떤 주제에 대한 최근 맥락을 되살리고 싶을 때. 내 채팅 기록과 공유 기록에서 복원해 간결한 현재 상태 브리핑으로 돌려줍니다. |
| [`/ketchup`](./skills/ketchup/SKILL.md) | 내 마지막 메시지 이후 이 채팅에서 바뀐 내용을 쉬운 말과 작은 그림으로 보고 싶을 때. 내 결정을 기다리는 항목은 모두 나열되며, 답장만 읽고도 결정할 수 있습니다. 답장이 길어져도 그렇게 합니다. |
| [`/blast-radius`](./skills/blast-radius/SKILL.md) | 작아 보이는 변경이 그 밖에 무엇을 깨뜨릴 수 있는지 알고 싶을 때. 안전하다고 주장하는 대신, 그렇게 말할 수 있는 근거 하나를 코드를 실행해서 증명합니다. |
| [`/architect`](./skills/architect/SKILL.md) | 함수 경계를 넘나드는 코드를 쓰기 전에, 호출하는 쪽의 사용 방식, 타입, 모듈 구조부터 정하고 싶을 때. |
| [`/arena`](./skills/arena/SKILL.md) | 같은 일을 N개의 병렬 시도로 해 보고, 각 시도의 좋은 부분만 골라 쓰고 싶을 때. |
| [`/swarm`](./skills/swarm/SKILL.md) | 서로 다른 조각이나 경쟁 조건을 N개의 병렬 워커에게 나눠 맡기고, 보고서 하나로 취합하고 싶을 때. |
| [`/interrogate`](./skills/interrogate/SKILL.md) | diff가 있고, 서로 다른 모델이 그것을 깨뜨려 보게 하고 싶을 때. 엄격한 코드 품질 관점도 포함합니다. |
| [`/automate-me`](./skills/automate-me/SKILL.md) | 내가 실제로 일해 온 방식을 바탕으로 나만의 `-mode` 스킬 초안을 받고 싶을 때. |
| [`/make-bot-ui`](./skills/make-bot-ui/SKILL.md) | 버튼을 누르면 webhook으로 시작되는 자동화가 깨어나는 페이지나 대시보드를 만들고 싶을 때. 발신자 키 전달과 Tailscale 설정도 다룹니다. |
| [`/setup-mstack`](./skills/setup-mstack/SKILL.md) | mstack이 역할별로 쓸 모델을 고르고 싶을 때. 쓸 수 있는 모델을 찾아 설정 규칙으로 저장합니다. |
| [`/reflect`](./skills/reflect/SKILL.md) | 긴 작업이 끝났고, 그 방법을 스킬 수정으로 남기고 싶을 때. |
| [`/correct`](./skills/correct/SKILL.md) | 같은 실수를 에이전트에게 계속 고쳐 달라고 하게 될 때. 기록을 뒤져 실수 유형을 찾고, 각각을 효과가 있는 가장 높은 층위에서 고칩니다(아키텍처 → 타입·린트·CI → 테스트 → 문서 순). 각 규칙을 그것을 강제하는 수단과 짝지은 표도 유지합니다. |
| [`/teach`](./skills/teach/SKILL.md) | 변경이나 서브시스템을 요약만 받는 데서 그치지 않고 제대로 이해하고 싶을 때. how와 why를 함께 돌려, 다이어그램을 하나씩 쌓아 가며 쉬운 설명 하나로 엮어 줍니다. |
| [`/tdd`](./skills/tdd/SKILL.md) | 버그를 고치는데 로컬에서 싸게 돌릴 수 있는 테스트 경로가 있을 때. 실패하는 테스트를 먼저 쓰고 그다음 고칩니다. |
| [`/benchmark-checklist`](./skills/benchmark-checklist/SKILL.md) | 벤치마크를 돌렸거나 속도 향상 또는 퇴보를 측정했을 때. 보고하거나 그 숫자대로 움직이기 전에, 한계 요인, 튜닝, 오류, 반복 실행, 전체 흐름에서의 의미를 따져 숫자를 검증합니다. |
| [`/no-comments`](./skills/no-comments/SKILL.md) | 리뷰 전에 주석을 걷어낼 때. Comment Sicko를 띄워 받아들인 지적을 고치고, 주석이 주장하던 제약을 코드 구조로 옮기는 방법을 제안합니다. |
| [`/typescript-best-practices`](./skills/typescript-best-practices/SKILL.md) | typescript를 읽거나 고칠 때. type-system-discipline 원칙을 실제 문법에 연결해 줍니다. |
| [`/figure-it-out`](./skills/figure-it-out/SKILL.md) | 기본 제공 플레이북 중 맞는 것이 없을 때. 그 작업에 맞는, 엄격하고 감사(audit)할 수 있는 플레이북을 설계합니다. |
| [`/show-me-your-work`](./skills/show-me-your-work/SKILL.md) | 검토할 수 있는 결정 기록이 필요할 때. 결정을 커밋 가능한 tsv에 기록합니다. |
| [`/create-verification-skill`](./skills/create-verification-skill/SKILL.md) | 프로젝트에 앱 동작을 증명할 스크립트 방법이 없을 때. 기능 맵(feature map)이 있는 프로젝트 전용 verify 스킬을 만들어 줍니다. 언어와 플랫폼은 가리지 않습니다. |
| [`/maintain-verification-skill`](./skills/maintain-verification-skill/SKILL.md) | verify 스킬의 기능 맵이 앱과 어긋났을 때. 소스를 한 번 훑고 실제 앱에서 한 번 확인한 뒤, 증명된 수정만 담아 PR을 최대 한 개 올립니다. |
| [`/create-formal-verification-skill`](./skills/create-formal-verification-skill/SKILL.md) | 경쟁 조건, 재시도, 상태 머신, 파서, unsafe 코드가 깨지는 경우를 테스트가 잡지 못할 때. 상황에 맞는 도구로 속성 하나를 검증하고, 변경할 때마다 다시 확인하는 프로젝트 전용 스킬을 만듭니다. |
| [`/maintain-formal-verification-skill`](./skills/maintain-formal-verification-skill/SKILL.md) | 형식 검증이 다루는 코드가 마지막 검증 이후 바뀌었을 때. 모델, 하네스, 속성을 코드에 맞게 고치고 다시 돌립니다. 실패마다 검증이 어긋난 것인지 코드의 버그인지도 알려 줍니다. |
| [`/unslop`](./skills/unslop/SKILL.md) | 글을 다듬을 때. AI 티가 나는 표현을 없앱니다. |
| [`/bro`](./skills/bro/SKILL.md) | 마지막 메시지를 전문 용어 없이 쉬운 말로 다시 듣고 싶을 때. |
| [`/technical-writing`](./skills/technical-writing/SKILL.md) | 문서, RFC, readme, PR 설명, 커밋 메시지를 쓸 때 쓰는 계층형 문서 기준(Diátaxis + Google developer style + STE + Global English). |

</details>

### 예시

저는 대체로 작업을 시작할 때 [`/mineru-mode`](./skills/mineru-mode/SKILL.md)를 입력하고, 맞는 플레이북으로 보내는 일을 맡깁니다. 나머지 스킬은 단계에 필요할 때 자동으로 실행됩니다. 그래도 직접 꺼내 쓰는 것이 몇 가지 있습니다.

<details>
<summary>모든 예시</summary>

```
bug fix:           /mineru-mode 이 PR에 버그가 있어요. 가만히 두어도 750ms마다 스크롤이
                   밀립니다. 먼저 재현하고, 고친 다음 검증해 주세요.
perf:              /mineru-mode 가상화(virtualize)를 했는데도 큰 목록이 뜨는 데 1~2초가
                   걸려요. CPU trace를 떠서 이유를 알려 주세요.
feature:           /mineru-mode 기능 플래그 뒤에 작은 기능을 만들어 주세요. 정말 동작하는지
                   검증도 해 주세요.
prototype:         /mineru-mode 비교할 수 있게 markdown renderer 프로토타입을 두 개
                   만들어 주세요. 에이전트를 하나씩 띄워서요.
multi-phase:       /mineru-mode 이 스킬들을 플러그인으로 오픈소스화해 주세요. 내부 정보가
                   새면 안 되고, 임시 디렉터리에서 작업하고, 의존성 그래프부터 보여 주세요.
overnight run:     /mineru-mode 저는 자러 갑니다. CI가 불안정해도 스택을 머지해 주세요.
                   아침까지 전부 머지되어 있으면 좋겠습니다.
babysit:           /mineru-mode PR 123 상태 좀 봐 주세요. 남은 게 있나요?
visual parity:     /mineru-mode 이 플래그를 켜면 행 간격이 너무 넓어요. 두 번째 이미지가
                   정답입니다. 똑같아질 때까지 재현하고 고쳐 주세요.
figure it out:     /mineru-mode 자리를 비웁니다. 동기 store를 쓰는 모든 호출부를 새 비동기
                   store로 옮겨 주세요. 동작은 똑같이 유지해야 합니다. 돌아왔을 때 제대로
                   끝났다고 믿을 수 있었으면 합니다.
how:               /how 실행 취소는 어떻게 동작해? 취소할 run을 하나씩 조회하면서 n+1 문제가
                   생기지는 않아?
why:               /why 이 기능 플래그는 왜 아직 안 켜졌어?
architect:         이 계측은 신호가 뚜렷하고 오탐이 없게 설계해 줘. 먼저 /architect 로
                   진행해 줘.
arena:             /arena 내 프롬프트를 그대로 arena에 가져가 줘. 그쪽 제안과 네 제안을
                   비교해 보고 싶어.
swarm:             /swarm packages/ 아래 모든 패키지를 각자의 check.sh로 검사해 줘. 패키지
                   하나당 워커 하나. 보고서는 하나로.
interrogate:       /interrogate 이 PR을 리뷰해 줘.
tdd:               /tdd implement
unslop:            새로 바뀐 부분에서 슬롭을 걷어내고 더 간결하게 다듬어 줄래?
reflect:           /reflect 너무 오래 걸렸어. 다음번에는 같은 일을 반복하지 않도록 배운
                   점을 정리해 줘.
correct:           /correct
show-me-your-work: /show-me-your-work 돌아와서 검토할 수 있게 결정 기록을 남겨 줘.
automate-me:       /automate-me
help:              /mineru-help 이 브랜치를 리뷰하려면 어떤 스킬을 쓰면 좋아?
```

</details>

## `mineru-agent`와 Comment Sicko 서브에이전트

[`/mineru-mode`](./skills/mineru-mode/SKILL.md)는 호출을 받은 채팅 안에서 실행됩니다. 플레이북, todo 목록, 모든 서브에이전트 생성은 그 채팅이 맡습니다.

mstack은 실행 중에 만드는 위임 대상(delegate)의 래퍼로 [`subagent_type: "mineru-agent"`](./agents/mineru-agent.md)도 제공합니다. 이 에이전트는 작업을 시작하기 전에 인라인 원칙 색인을 포함한 `mineru-mode` 전체를 읽습니다. 이를 `generalPurpose`로 대신하면 그 단계를 건너뛰어 동작이 어긋납니다. 플레이북 자체를 돌리려고 `mineru-agent`를 생성해서는 안 됩니다.

[`/mineru-mode`](./skills/mineru-mode/SKILL.md)와 [`subagent_type: "mineru-agent"`](./agents/mineru-agent.md)는 같은 래퍼를 거칩니다.

mstack은 읽기 전용 주석 리뷰어인 [Comment Sicko](./agents/comment-sicko.md)도 `subagent_type: "comment-sicko"`로 제공합니다. 보통은 직접 부르지 않고 [`/no-comments`](./skills/no-comments/SKILL.md)로 호출합니다.

## 원칙

짧은 스킬 스물네 개이며, 스킬마다 원칙 하나를 담고 있습니다. `mineru-mode`는 이 원칙들을 인라인 색인으로 갖고 있고, 작업을 시작할 때 그 색인을 읽습니다. 원칙별 파일을 따로 둔 이유는 두 가지입니다. 다른 스킬이 원칙을 이름으로 참조할 수 있게 하고, 색인에서 각 원칙의 전체 규칙으로 연결할 수 있게 하려는 것입니다.

<details>
<summary>원칙 스물네 개</summary>

| 원칙 | 그룹 | 규칙 |
|---|---|---|
| [laziness-protocol](./skills/principle-laziness-protocol/SKILL.md) | core | 지우는 쪽을 먼저 택하고, 문제를 풀 수 있는 가장 작은 변경을 택합니다. |
| [foundational-thinking](./skills/principle-foundational-thinking/SKILL.md) | core | 로직을 쓰기 전에 적용합니다. 핵심 타입과 자료구조를 고를 때, 뼈대(scaffold) 작업과 기능 작업의 순서를 정할 때, 동시에 움직이는 주체들이 무엇을 공유하는지 물을 때가 해당합니다. 자료구조를 제대로 잡으면 나머지 코드는 저절로 분명해집니다. |
| [redesign-from-first-principles](./skills/principle-redesign-from-first-principles/SKILL.md) | core | 요구사항을 덧붙이지 않고, 처음부터 기본 전제였던 것처럼 다시 설계합니다. |
| [attack-the-premise](./skills/principle-attack-the-premise/SKILL.md) | core | 같은 전제를 공유하는 수정 두 개 이상이 같은 관문에서 실패했을 때 적용합니다. 그 전제를 적어 두고, 이를 가정한 수정을 또 쓰기 전에 전제부터 직접 검증합니다. |
| [subtract-before-you-add](./skills/principle-subtract-before-you-add/SKILL.md) | core | 쓸모없는 부분, 중복 검증기, 스텁 참조를 먼저 지우고 더 단순해진 토대 위에 짓습니다. |
| [minimize-reader-load](./skills/principle-minimize-reader-load/SKILL.md) | core | 질문에서 답까지 거치는 층의 수와, 읽는 사람이 머릿속에 들고 있어야 하는 숨은 상태를 셉니다. 호출하는 곳이 하나뿐인 래퍼는 합치고, 변경 가능한 범위는 줄입니다. |
| [outcome-oriented-execution](./skills/principle-outcome-oriented-execution/SKILL.md) | core | 단계 경계가 분명한 계획된 재작성과 마이그레이션에 적용합니다. 목표 아키텍처로 곧장 수렴하고, 버려질 호환 코드로 매끄러운 중간 상태를 유지하려 하지 않습니다. |
| [experience-first](./skills/principle-experience-first/SKILL.md) | core | 구현이 편한 쪽보다 사용자가 기뻐할 쪽을 고릅니다. 거친 기능을 많이 내놓기보다 잘 다듬은 기능을 적게 내놓습니다. |
| [exhaust-the-design-space](./skills/principle-exhaust-the-design-space/SKILL.md) | core | 확정하기 전에 경쟁하는 프로토타입 2~3개를 만들어 나란히 비교합니다. |
| [build-the-lever](./skills/principle-build-the-lever/SKILL.md) | core | 대량 작업만이 아니라 간단하지 않은 모든 작업(수정, 마이그레이션, 분석, 점검)에 적용합니다. 손으로 하는 대신 그 일을 대신하거나 증명해 주는 도구(codemod, 스크립트, 생성기, 서브에이전트가 따르는 스킬)를 만듭니다. 리뷰어가 다시 돌려볼 수 있는 결과물이 곧 그 도구입니다. |
| [model-the-domain](./skills/principle-model-the-domain/SKILL.md) | architecture | 도메인을 여기저기 흩어진 조건문이 아니라 구조로 표현합니다. |
| [boundary-discipline](./skills/principle-boundary-discipline/SKILL.md) | architecture | 방어 코드는 시스템 경계(CLI, 설정, 네트워크, 외부 API)에 모읍니다. 내부 타입은 신뢰하고, 비즈니스 로직은 순수 함수에 둡니다. |
| [type-system-discipline](./skills/principle-type-system-discipline/SKILL.md) | architecture | 잘못된 상태를 표현할 수 없게 만듭니다. 의미가 있는 원시값에는 브랜드를 붙이고, 외부 데이터는 경계에서 파싱하며, 모든 variant를 빠짐없이 처리하고, 공식 스키마에서 타입을 만들어 냅니다. |
| [make-operations-idempotent](./skills/principle-make-operations-idempotent/SKILL.md) | architecture | 이전에 어디까지 실행됐든 같은 최종 상태에 도달하게 합니다. |
| [migrate-callers-then-delete-legacy-apis](./skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md) | architecture | 호환 계층을 남기지 않고, 호출부를 옮기는 일과 옛 API를 지우는 일을 같은 묶음에서 끝냅니다. |
| [separate-before-serializing-shared-state](./skills/principle-separate-before-serializing-shared-state/SKILL.md) | architecture | 공유부터 없앱니다. 쓰는 주체 하나를 공유하는 것이 진짜 불변 조건일 때만 구조적으로 직렬화합니다. |
| [prove-it-works](./skills/principle-prove-it-works/SKILL.md) | verification | 작업을 끝낸 뒤, 완료를 선언하기 전에 적용합니다. 대리 지표나 자기 보고, '컴파일됨'이 아니라 실제 결과물로 검증합니다. 기능을 실행해 보고, 실제 값을 읽고, diff를 살펴봅니다. |
| [fix-root-causes](./skills/principle-fix-root-causes/SKILL.md) | verification | 증상마다 시스템이 처음 잘못된 지점까지 거슬러 올라가 거기서 고칩니다. 방어 코드(guard)가 해결책이 되는 경우는 그것이 다루는 상태가 정상일 때뿐입니다. |
| [sequence-verifiable-units](./skills/principle-sequence-verifiable-units/SKILL.md) | verification | 여러 단계로 된 작업(일괄 수정, 마이그레이션, 비슷한 수정의 연속)과 커밋·PR을 쌓는 방식에 적용합니다. 작업을 각각 검증 가능한 상태로 끝나는 작은 단위로 나누고, 다음으로 넘어가기 전에 단위마다 확인합니다. 순서만 봐도 리뷰어가 납득하도록 전달 순서를 정합니다. |
| [test-behavior-not-implementation](./skills/principle-test-behavior-not-implementation/SKILL.md) | verification | 테스트를 쓰거나 바꾸거나 남길 때 적용합니다. 코드를 쓰는 쪽에서 볼 수 있는 동작을 검증하면, 그 동작이 깨질 때 테스트가 실패하고 내부만 바뀔 때는 계속 통과합니다. |
| [explain-the-number](./skills/principle-explain-the-number/SKILL.md) | verification | 측정한 숫자(속도 향상, 성능 퇴보, 처리량, 지연 시간, 평가 결과)를 믿거나 보고하거나 근거로 삼기 전에 적용합니다. 그 숫자를 제한하는 요인을 찾고, 의도한 작업이 아닌 다른 것을 측정한 것은 아닌지 배제합니다. |
| [guard-the-context-window](./skills/principle-guard-the-context-window/SKILL.md) | delegation | 대량 작업은 서브에이전트에 맡기고, 메인 스레드에는 원본 데이터가 아니라 요약만 둡니다. |
| [never-block-on-the-human](./skills/principle-never-block-on-the-human/SKILL.md) | delegation | 일단 진행하고 결과를 보여 준 뒤, 사람이 나중에 방향을 바로잡게 합니다. 확인은 되돌릴 수 없는 작업에만 요청합니다. |
| [encode-lessons-in-structure](./skills/principle-encode-lessons-in-structure/SKILL.md) | meta | 규칙을 글로 더 적는 대신 lint, 메타데이터 플래그, 런타임 검사, 스크립트로 만듭니다. |

</details>

## 포함되지 않은 것

`mineru-mode`가 언급하지만 함께 제공하지 않는 것들입니다.

- `/deslop`은 없습니다. `no-comments`와 `unslop` 스킬에 쉬운 말로 다듬는 단계를 더해 쓰세요. 설명만 늘어놓는 주석, 근거 없는 방어 코드, 죽은 호환 경로, 요청과 무관한 수정을 제거합니다.
- `control-cli`와 `control-ui`는 없습니다. 저장소나 하네스가 제공하는 UI·CLI 조작 스킬을 쓰세요(claude code는 chrome 또는 playwright MCP, codex는 browser 또는 computer use).
- 스킬 작성에는 하네스가 제공하는 `skill-creator` 스킬을 씁니다(codex에서는 `$skill-creator`). 두 하네스 모두 `/autopilot` PR 감시 기능은 내장하지 않습니다. `mineru-mode` 안에서는 PR 상태 요청을 [babysit 플레이북](./skills/mineru-mode/playbooks/babysit.md)으로 보냅니다.

## 왜 계획(planning) 스킬이 없나요?

claude code의 plan mode와 codex의 plan mode(`/plan`) 모두 mstack과 잘 맞습니다. 다만 저는 계획을 믿지 않습니다. 가장 좋은 명세는 코드입니다. 계획을 세우고 싶다면 [`/mineru-mode`](./skills/mineru-mode/SKILL.md)가 해 주지만, 기본 동작은 아닙니다.

## 나에게 맞게 바꾸기

`mineru-mode`는 제 방식이라, 여러분에게는 맞지 않을 수 있습니다.

[`/automate-me`](./skills/automate-me/SKILL.md)를 입력하세요. 최근 대화 기록을 분석해서, 내가 실제로 일해 온 방식을 바탕으로 `<your-name>-mode` 스킬 초안을 만들고, 내부에서는 mstack을 거치도록 연결합니다. mstack을 기반으로 유지한 채 `mineru-mode` 옆에 나만의 라우팅 스킬이 생깁니다.

모델도 바꿀 수 있습니다. [`/setup-mstack`](./skills/setup-mstack/SKILL.md)을 입력하세요. 접근 가능한 모델을 찾아서, 각 역할(코드, 판단, 리뷰 패널)에 모델을 연결하는 작은 상시 적용 규칙을 만듭니다. 모든 스킬이 이 규칙을 읽고, 규칙이 없으면 합리적인 기본값을 씁니다. 그래서 바꾸고 싶은 부분만 덮어쓰면 됩니다.

기본값이 바뀌면, 바뀌기 전에 만든 규칙은 옛 기본값을 그대로 붙잡고 있습니다. 그럴 때는 그 역할 줄을 지우거나 파일 전체를 지운 뒤 `/setup-mstack`을 다시 실행하세요. 다시 실행해도 기본값과 다르게 고른 역할의 모델은 그대로 남습니다.

## 자동화

mstack에는 아직 활성화되지 않은 [benny 자동화 팩](./automations/benny/)도 들어 있습니다. benny는 slack에 올라온 이슈 제보를 분류한 뒤, 확인된 버그를 재현하고 실제 UI 증거와 함께 고칩니다. 이 팩의 파일은 슬래시 스킬로 등록되지 않습니다.

설정하려면 에이전트에게 [`FOR_AGENTS.md`](./automations/benny/FOR_AGENTS.md)를 보여 주세요. 설정 과정에서 팩이 대상 저장소의 `.mstack/automations/benny/`에 복사되고, 그 저장소에서 공유 스킬을 쓸 수 있도록 mstack이 활성화되며, 사용자 설정은 복사된 팩 바깥에 보관됩니다. benny는 claude code routines(`/schedule`)나 codex 앱 automations(또는 예약한 `codex exec`)로 실행됩니다.

## 라이선스

MIT
