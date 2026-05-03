# 에이전트·자동화 도구 안내

이 저장소는 **Svelte 5**와 **SvelteKit**을 사용한다. 코드 제안·리팩터·새 기능은 **순수 Svelte 문법(템플릿 지시문, 바인딩, 룬)을 우선**하고, React식 패턴이나 불필요한 명령형 스크립트·과도한 CSS로 우회하지 않는다.

## 규칙

- 상세 가이드: **`.cursor/rules/*.mdc`** (철학, 마크업, 반응성, 스타일, SvelteKit 주제별).
- 공식 문서와 예시가 필요하면 워크스페이스의 **Svelte MCP**를 활용한다.

## 변경 후 확인

로컬에서 아래를 실행해 타입·Svelte 진단을 통과시킨다.

```bash
npm run check
```

배포 전 **GitHub Actions**에서도 동일하게 `npm run check`가 실행된다.

## 기타 스크립트

| 명령            | 용도              |
| --------------- | ----------------- |
| `npm run lint`  | Prettier + ESLint |
| `npm run test`  | 단위 테스트       |
| `npm run build` | 프로덕션 빌드     |
