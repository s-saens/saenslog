# Cloudflare Workers 마이그레이션

## 개요

**saenslog**는 Node.js 어댑터 + PM2 자가 호스팅에서 **Cloudflare Workers SSR + R2 미디어 스토리지**로 전환되었다.

| 항목 | 기존 | 현재 |
|------|------|------|
| 호스트 | 자가 호스팅 (PM2) | Cloudflare Workers (엣지 런타임) |
| 블로그 글 | Supabase | Supabase (변경 없음) |
| 미디어 (blog/, musics/) | `static/` 디스크 | R2 버킷 `saenslog-media` |
| 정적 에셋 | 디스크 | Workers static assets |
| 어댑터 | @sveltejs/adapter-node | @sveltejs/adapter-cloudflare |

## 현재 상태

- ✅ 코드 마이그레이션 완료
  - 모든 파일시스템 접근을 `mediaStore.ts` 추상화로 통일
  - dev 환경은 `static/`, 프로덕션은 R2에서 서빙
  - 빌드 시 node:fs 코드는 트리셰이킹되어 Workers 번들에 미포함
- ✅ 빌드 성공 (`npm run build`)
- ✅ 타입 체크 통과 (`npm run check`)
- ✅ 테스트 통과 (`npm test`)
- ✅ wrangler dry-run 성공 (`npx wrangler deploy --dry-run`)
- ❌ R2 버킷 활성화 필요 (Cloudflare 대시보드)
- ❌ wrangler 인증 필요 (`wrangler login`)
- ❌ 미디어 업로드 및 배포 아직 미실행

## 배포 단계

### 1단계: Cloudflare 인증

```bash
! npx wrangler login
```

이 명령은 브라우저를 열어 Cloudflare 계정으로 인증한다. 인증 완료 후 로컬 CLI에 자격증명이 저장된다.

### 2단계: R2 활성화

Cloudflare 대시보드에서:
1. **R2** 메뉴로 이동
2. **R2 활성화** 버튼 클릭 (약관 동의)
3. 완료

### 3단계: R2 버킷 생성 및 미디어 업로드

```bash
# R2 버킷 생성 (saenslog-media)
npx wrangler r2 bucket create saenslog-media

# 기존 미디어 일괄 업로드 (static/blog + static/musics)
chmod +x scripts/upload-media-to-r2.sh
scripts/upload-media-to-r2.sh --remote
```

총 ~99MB의 이미지·오디오 파일이 업로드된다.  
(`static/blog/Daily/20260422/` 아래 41MB wav와 27MB png가 주요 용량)

### 4단계: Worker 시크릿 설정

Supabase 시크릿 키를 Cloudflare Worker에 등록:

```bash
npx wrangler secret put SUPABASE_SECRET_KEY
```

프롬프트에서 `.env` 파일의 `SUPABASE_SECRET_KEY` 값을 입력한다.

### 5단계: 배포

```bash
npm run deploy
# = npm run build && wrangler deploy
```

명령 완료 후 콘솔 출력에서 Worker URL(예: `https://saenslog.your-account.workers.dev`)을 확인한다.

### 6단계: 도메인 연결 (선택)

프로덕션 URL `https://saens.kr`를 Workers로 가리키려면:

1. Cloudflare 대시보드 → **Workers & Pages** → **saenslog**
2. **트리거** → **커스텀 도메인** → `saens.kr` 추가
3. DNS 확인 및 SSL 발급 (자동)

## 로컬 개발

### 개발 서버 (SvelteKit)

```bash
npm run dev
```

- 미디어: `static/` 디렉터리에서 직접 서빙
- Supabase 접근: `.env`의 `PUBLIC_SUPABASE_URL` 등 참고
- 변경사항 핫 리로드 지원

### Workers 런타임 시뮬레이션 (Wrangler)

```bash
npm run preview
```

- `.svelte-kit/cloudflare` 빌드 후 `wrangler dev` 실행
- 미디어: 로컬 R2 시뮬레이션에서 서빙 (`--local` 플래그)
- 환경: `.dev.vars`의 시크릿 로드

시크릿 테스트 시 `.dev.vars` 파일 생성 (git 제외):

```
SUPABASE_SECRET_KEY=your-secret-key
COMMENT_RATE_LIMIT_SECRET=optional-custom-secret
```

## 구조 변경 사항

### mediaStore.ts (신규)

`src/lib/server/mediaStore.ts`는 미디어 저장소를 추상화한다:

```typescript
export interface MediaStore {
  list(prefix: string): Promise<MediaObjectInfo[]>;
  get(key: string): Promise<MediaContent | null>;
  put(key: string, data: ArrayBuffer, contentType: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
}
```

- **프로덕션**: R2 버킷 사용
- **개발**: `static/` 파일시스템 사용 (dev 시점의 동작 동일)
- **빌드 최적화**: dev 분기는 트리셰이킹으로 제거 → node:fs 미포함

### 마이그레이션된 코드

| 파일 | 변경 |
|------|------|
| `hooks.server.ts` | `/blog/*`·`/musics/*` 요청을 mediaStore에서 처리 |
| `src/lib/server/blogPostAssets.ts` | 디스크 경로 → R2 키 기반 연산 |
| `src/lib/server/tracks.ts` | `readdir` → `mediaStore.list()` |
| `src/routes/admin/api/upload-media/+server.ts` | 파일 쓰기 → R2 `put()` |
| `src/routes/admin/api/media/+server.ts` | 디렉터리 스캔 → R2 `list()` |
| `src/routes/blog/[...path]/+page.server.ts` | 글 삭제 시 에셋 폴더 → R2 `deletePrefix()` |
| `src/routes/admin/posts/[id]/edit/+page.server.ts` | 글 삭제 시 에셋 정리 → R2 `deletePrefix()` |
| `src/routes/projects/[title]/+page.server.ts` | `readFile` → `import.meta.glob(?raw)` 번들 |

## 환경 변수

### 빌드 시 주입 (wrangler.jsonc `vars`)

```jsonc
{
  "vars": {
    "PUBLIC_SITE_URL": "https://saens.kr",
    "PUBLIC_SUPABASE_URL": "https://vsxvwdvvavoruocqvrgl.supabase.co",
    "PUBLIC_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_n_HGbMasMy29dRCzmWfP-Q_UJt1iwat"
  }
}
```

### 런타임 시크릿 (Cloudflare 대시보드 또는 CLI)

```bash
npx wrangler secret put SUPABASE_SECRET_KEY
```

로컬 개발용 `.dev.vars`:

```
SUPABASE_SECRET_KEY=your-local-test-key
COMMENT_RATE_LIMIT_SECRET=optional-key
```

## 정적 에셋 제외

`static/.assetsignore`는 Workers 에셋 업로드에서 제외할 경로를 지정:

```
blog
musics
CNAME
.nojekyll
```

- **blog/·musics/** : R2에서 서빙 (25MiB 초과 파일 존재)
- **CNAME·.nojekyll** : GitHub Pages 설정 (Workers 불필요)

## 트러블슈팅

### "R2 MEDIA 바인딩이 없습니다"

**원인**: Cloudflare 대시보드에서 R2가 활성화되지 않았거나 wrangler 인증이 실패했다.

**해결**:
1. 대시보드에서 R2 활성화 확인
2. `npx wrangler login` 재인증
3. `npm run preview` 또는 `npm run deploy` 재시도

### 미디어 파일이 404

**원인**: R2 업로드가 완료되지 않았거나 키 형식이 다르다.

**해결**:
1. `npx wrangler r2 object list saenslog-media | head -20` 으로 업로드 확인
2. 누락된 파일이 있으면 `scripts/upload-media-to-r2.sh --remote` 재실행

### Workers 배포 실패

**원인**: 환경 변수 또는 시크릿 미설정.

**해결**:
1. `SUPABASE_SECRET_KEY` 설정 확인: `npx wrangler secret list`
2. 누락 시 `npx wrangler secret put SUPABASE_SECRET_KEY` 재설정
3. `npm run deploy` 재시도

## 참고 자료

- [SvelteKit Cloudflare Adapter 문서](https://kit.svelte.dev/docs/adapter-cloudflare)
- [Wrangler CLI 가이드](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare R2 문서](https://developers.cloudflare.com/r2/)
- [workers-types 타입 정의](https://github.com/cloudflare/workers-types)

## 마이그레이션 커밋

```
6ac9965 refactor(projects) 프로젝트 설명 마크다운을 번들 import로 전환
7987817 refactor(media) 미디어 저장소를 로컬 파일시스템에서 R2로 전환
0c08ff4 feat(deploy) Cloudflare Workers 호스팅으로 전환 (adapter-cloudflare)
efc1299 docs(deploy) Vercel 배포 검토 문서 추가
beda5f8 chore(agents) 에이전트 설정을 .agents에서 .claude로 이전
```

`git log --oneline` 또는 GitHub에서 확인 가능.
