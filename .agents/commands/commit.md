---
description: 변경사항 분석 후 커밋 규칙에 맞춰 여러 커밋을 만들고 푸시까지 수행합니다(프로젝트 commit 스킬 준수).
---

# 커밋 실행

1. **반드시** 프로젝트의 커밋 스킬을 읽고 그 지침을 그대로 따른다: `.agents/skills/commit/SKILL.md`
2. 스킬에 적힌 단계(변경 파악, 그룹화, 메시지 초안, 설정 확인, 커밋·푸시 등)를 빠짐없이 수행한다.
3. 스킬의 `config.json`이 있으면(`.agents/skills/commit/config.json` 또는 `~/.cursor/skills/commit/config.json`) 그 설정을 우선한다.

이 명령은 “커밋 메시지 작성”, “분할 커밋”, “git add/commit/push” 요청과 동일하게 취급한다.
