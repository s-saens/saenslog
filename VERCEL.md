# Vercel 배포 가이드

현재 저장소는 **Node 어댑터 + PM2 + 로컬 디스크** 기준으로 동작한다. Vercel(서버리스)에 올리려면 아래 항목을 순서대로 확인한다.

관련 문서: [SPEED-ISSUE.md](./SPEED-ISSUE.md) — 기존 Cloudflare 터널·자가 호스팅 환경의 TTFB 분석

---

## 현재 상태 vs Vercel

| 항목 | 현재 | Vercel |
|------|------|--------|
| 어댑터 | `@sveltejs/adapter-node` | `@sveltejs/adapter-vercel` 필요 |
| 프로세스 관리 | PM2 (`ecosystem.config.cjs`) | 불필요 |
| 시작 명령 | `node build/index.js` | Vercel이 빌드 산출물 자동 실행 |
| 환경 변수 접두사 | `APP_` (adapter-node 전용) | 불필요 — `PUBLIC_*` / 서버 변수 그대로 사용 |
| 블로그 미디어 | `static/blog/` 디스크 쓰기 | 빌드에 포함된 파일만 영구 보존 |
| 리전 | 한국 PC + CF 터널 | `icn1`(서울) 지정 가능 |

---

## 1. 어댑터 교체 (필수)

```bash
npm i -D @sveltejs/adapter-vercel
npm uninstall @sveltejs/adapter-node   # 선택
```

`svelte.config.js` 예시:

```js
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		prerender: {
			handleHttpError: 'warn',
			handleMissingId: 'warn'
		}
	}
};

export default config;
```

- `envPrefix: 'APP_'`는 **제거**한다. 앱 코드는 이미 `$env/dynamic/public`·`private`를 사용한다.
- `ecosystem.config.cjs`, `npm start`, PM2는 Vercel 배포에 쓰이지 않는다.

로컬 확인:

```bash
npm run check
npm run build
```

---

## 2. 환경 변수 (필수)

Vercel 대시보드 → **Project → Settings → Environment Variables**  
Production·Preview 환경 모두에 설정한다.

| 변수 | 공개 | 용도 |
|------|------|------|
| `PUBLIC_SUPABASE_URL` | 예 | Supabase 프로젝트 URL |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 예 | Publishable 키 (`sb_publishable_…`) |
| `PUBLIC_SUPABASE_ANON_KEY` | 예 | 전환 기간 레거시 anon JWT (Publishable 없을 때 폴백) |
| `SUPABASE_SECRET_KEY` | 아니오 | 서버 전용 — 비회원 댓글·좋아요·관리자 API |
| `PUBLIC_SITE_URL` | 예 | `https://saens.kr` — canonical, sitemap, robots, OG |
| `COMMENT_RATE_LIMIT_SECRET` | 아니오 | 선택. 없으면 `SUPABASE_SECRET_KEY`로 IP 해시 |

참고 파일:

- `src/lib/server/supabase.ts` — `PUBLIC_SUPABASE_*`
- `src/lib/server/supabaseService.ts` — `SUPABASE_SECRET_KEY`
- `src/routes/+layout.server.ts`, `sitemap.xml`, `robots.txt` — `PUBLIC_SITE_URL`

로컬 `.env` 값을 그대로 복사하되, **`APP_` 접두사는 붙이지 않는다.**

---

## 3. Supabase 인증 URL (필수)

Supabase 대시보드 → **Authentication → URL configuration**

| 설정 | 값 |
|------|-----|
| Site URL | `https://saens.kr` (또는 Vercel 프로덕션 도메인) |
| Redirect URLs | `https://saens.kr/auth/callback` |
| | `https://<프로젝트명>.vercel.app/auth/callback` (프리뷰 배포용) |

콜백 핸들러: `src/routes/auth/callback/+server.ts`

---

## 4. 도메인 연결 (필수)

`static/CNAME`에 `saens.kr`이 있으나, Vercel에서는 **대시보드에서 커스텀 도메인을 직접 연결**해야 한다.

1. Vercel → Project → **Domains** → `saens.kr` 추가
2. 안내된 DNS 레코드(A/CNAME)를 도메인 등록처에 설정
3. 기존 **Cloudflare 터널·자가 호스팅 프록시**는 끊거나 DNS만 Vercel로 전환

프로덕션 도메인 연결 후 `PUBLIC_SITE_URL`과 Supabase Site URL이 실제 도메인과 일치하는지 확인한다.

---

## 5. Vercel 프로젝트 설정

GitHub 저장소 연결 후 기본값으로 대부분 동작한다.

| 항목 | 값 |
|------|-----|
| Framework Preset | SvelteKit (자동 감지) |
| Build Command | `npm run build` |
| Output Directory | adapter-vercel이 처리 (수동 지정 불필요) |
| Install Command | `npm install` (기본) |

### 서울 리전 (권장)

한국 사용자 TTFB 개선을 위해 프로젝트 루트에 `vercel.json`을 둘 수 있다.

```json
{
	"regions": ["icn1"]
}
```

---

## 6. 런타임 디스크 쓰기 — 가장 큰 제약

Vercel 서버리스 함수는 **디스크에 쓴 파일이 요청 간·재배포 후에도 유지되지 않는다.**

### 영향 받는 기능

| 기능 | 구현 위치 | 동작 |
|------|-----------|------|
| 관리자 미디어 업로드 | `src/routes/admin/api/upload-media/+server.ts` | `static/blog/<id>/`에 `writeFile` |
| 미디어 라이브러리 목록 | `src/routes/admin/api/media/+server.ts` | 디스크 `readdir` |
| 글 삭제 시 에셋 정리 | `blog/[...path]/+page.server.ts`, admin edit | `fs.rm` |
| 에셋 복사·이동 | `src/lib/server/blogPostAssets.ts` | `mkdir`, `copyFile`, `rename`, `rm` |
| 커스텀 미디어 서빙 | `src/hooks.server.ts` | `static/`에서 `readFile` (런타임 업로드분) |

### Git에 포함된 정적 파일

`static/blog/*` 등 **저장소에 커밋된 이미지·오디오**는 빌드에 포함되어 Vercel CDN으로 서빙된다. **조회(읽기)는 문제없다.**

### 배포 전략 선택

**A. 읽기 전용 사이트 (당장 배포 가능)**  
- 블로그·프로젝트 조회, 댓글·좋아요( Supabase )는 동작  
- 관리자 업로드·에셋 삭제는 Vercel에서 **동작하지 않음** — 로컬 또는 별도 환경에서 콘텐츠 관리

**B. 관리자까지 Vercel에서 사용**  
- 업로드·에셋 관리를 **Supabase Storage**(또는 Vercel Blob)로 이전하는 코드 작업 필요  
- `hooks.server.ts`의 디스크 기반 미디어 서빙도 Storage URL 또는 프록시로 교체

---

## 7. 프로젝트 페이지 — 런타임 `fs` 확인

`src/routes/projects/[title]/+page.server.ts`는 빌드 시 `import.meta.glob`으로 메타·이미지를 묶지만, **설명 슬라이드(`descriptions/*.md`)는 런타임에** `src/lib/projects/`를 `readdir`·`readFile`로 읽는다.

Vercel 서버리스 번들에 `src/` 트리가 포함되지 않으면 설명 슬라이드가 비거나 오류가 날 수 있다.

**배포 후 반드시** `/projects/<제목>` 페이지를 확인한다.

필요 시 대응:

- `import.meta.glob`으로 descriptions를 빌드 타임에 포함
- 또는 `static/projects/` 등 배포 산출물에 확실히 들어가는 경로로 이동

---

## 8. Supabase 마이그레이션

DB 스키마는 Vercel과 무관하다. `supabase/migrations/`는 Supabase CLI 또는 대시보드로 **별도 적용**한다. 이미 프로덕션 DB에 반영돼 있으면 추가 작업 없음.

---

## 9. 배포 체크리스트

### 코드·설정

- [ ] `@sveltejs/adapter-vercel` 설치 및 `svelte.config.js` 수정
- [ ] (권장) `vercel.json`에 `"regions": ["icn1"]`
- [ ] `npm run check` / `npm run build` 통과

### Vercel 대시보드

- [ ] GitHub 저장소 연결
- [ ] 환경 변수 설정 (§2)
- [ ] 프로덕션·프리뷰 배포 성공 확인

### Supabase

- [ ] Site URL·Redirect URLs 설정 (§3)
- [ ] RLS·마이그레이션 상태 확인

### 도메인

- [ ] `saens.kr` Vercel에 연결
- [ ] `PUBLIC_SITE_URL` = `https://saens.kr`

### 배포 후 스모크 테스트

- [ ] `/` 홈
- [ ] `/blog`, `/blog/<글 id>` — 이미지·조회수·댓글
- [ ] `/projects/<제목>` — 설명 슬라이드
- [ ] `/login` → `/auth/callback` 로그인
- [ ] `/admin` (관리자) — 업로드 필요 시 §6 전략 B 여부 확인
- [ ] `/sitemap.xml`, `/robots.txt`

---

## 10. 당장 하지 않아도 되는 것

- `ecosystem.config.cjs` 수정·삭제 (Vercel에서 미사용)
- PM2 설치·설정
- `vercel.json` 없이도 기본 배포는 가능 (리전만 기본값 사용)

---

## 11. 예상 효과

[SPEED-ISSUE.md](./SPEED-ISSUE.md) 기준, 기존 환경의 TTFB 지연 상당 부분은 **Cloudflare 무료 요금제 경유 + 터널 왕복**에서 발생했다. Vercel 서울 리전(`icn1`)으로 옮기면 앱 코드 최적화에 더해 **전송 구간 지연 감소**를 기대할 수 있다. (Supabase는 이미 서울 리전으로 빠른 편.)

---

## 미구현 작업 (코드 변경 필요 시)

| 작업 | 우선순위 | 비고 |
|------|----------|------|
| adapter-vercel 교체 | 필수 | §1 |
| `vercel.json` (icn1) | 권장 | §5 |
| 관리자 업로드 → Supabase Storage | 관리자를 Vercel에서 쓸 때 | §6 |
| 프로젝트 descriptions 빌드타임 로딩 | 배포 후 500/빈 화면 시 | §7 |
