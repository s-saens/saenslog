# SSR 마이그레이션 플랜 (saenslog)

> 이 문서는 **AI 에이전트가 그대로 실행**할 수 있도록 작성된 단계별 작업 지시서다.
> 각 Phase 는 독립된 PR 단위로 커밋/푸시 가능하도록 구성했다. 절대 한 번에 전부 바꾸지 말 것.
> 작업 시 **반드시** `.cursor/rules/*.mdc` (svelte-philosophy, sveltekit-conventions, svelte-reactivity-runes 등) 와 `AGENTS.md` 를 먼저 읽고 컨벤션을 따른다.

---

## 0. 배경 & 목표

### 현재 상태 (2026-04-21 기준)

- **프레임워크**: SvelteKit 2.47, Svelte 5.41 (runes)
- **렌더링**: 완전 정적 (SSG)
  - `svelte.config.js` → `@sveltejs/adapter-static` + `fallback: '404.html'`
  - `src/routes/+layout.ts`, `src/routes/blog/[...path]/+page.ts`, `src/routes/projects/+page.ts`, `src/routes/projects/[title]/+page.ts` 모두 `export const prerender = true`
  - `blog/[...path]/+page.server.ts` 에 `EntryGenerator` 로 모든 경로를 빌드 타임에 수집
- **콘텐츠 저장**: `src/lib/blog/**/*.md` 파일 시스템
  - `src/lib/server/blog.ts` 가 `fs` + `gray-matter` + `marked` 로 파싱
- **배포**: `.github/workflows/deploy.yml` → GitHub Pages
- **음악 플레이어**: `static/musics/` 정적 파일 + `+layout.server.ts` 에서 `fs.readdirSync`

### 목표

1. **SSR (Server-Side Rendering)** 로 전환 — Node 런타임에서 동작
2. **블로그 글 작성/수정/삭제** UI 추가 (관리자 전용)
3. **회원(Auth) 기능** 추가
4. **댓글 기능** 추가
5. **자체 호스팅** (Windows PC, `localhost`→도메인 연결)

### 비(非)목표 / 제약

- 기존 정적 콘텐츠(`src/lib/blog/**/*.md`)는 **당장 DB 로 옮기지 않는다**. 파일 시스템을 primary source 로 유지하고, DB 는 신규 글/댓글/회원만 담당 (하이브리드). DB 전환은 Phase 7 에서 선택적으로 수행.
- 프로젝트 페이지(`projects/*`) 는 그대로 두고 블로그 우선으로 진행한다.
- 모든 UI/스타일 변경은 **Svelte 5 runes + 기존 테마 변수(`--bg`, `--text` 등)** 를 준수한다.

---

## 1. 사전 체크리스트 (AI 에이전트 필수 실행)

작업 시작 전, 매 Phase 시작마다:

```bash
git status          # 깨끗한 상태에서 시작
npm run check       # 기준 통과 확인
```

Phase 종료 시:

```bash
npm run check
npm run lint
npm run build       # adapter 교체 후에는 build 가 성공해야 함
```

실패 시 다음 Phase 로 넘어가지 말고 해결. 커밋 규칙은 `.cursor/skills/commit/SKILL.md` 를 따른다.

---

## 2. 의사결정 매트릭스 (한 번만 결정)

아래 값들은 Phase 시작 전에 사용자에게 **반드시 확인**하고, 본 문서 하단 "최종 선택" 섹션에 기록한다. 확인 전에는 추측하지 말 것.

| 항목 | 옵션 A (추천) | 옵션 B |
|---|---|---|
| **Node adapter** | `@sveltejs/adapter-node` (가장 단순, 자체 호스팅에 최적) | `adapter-auto` (Vercel 등 배포 시) |
| **DB** | **Supabase (cloud)** — 이미 Supabase MCP 가 플러그인으로 연결됨. 인증·DB·Realtime 댓글 모두 해결 | 로컬 Postgres + Drizzle ORM |
| **Auth** | Supabase Auth (`@supabase/ssr`) — 옵션 A 선택 시 | Lucia v3 + 자체 세션 테이블 |
| **댓글** | Supabase 테이블 + RLS + Realtime 구독 | 자체 API + polling |
| **에디터** | Markdown textarea + 프리뷰 (기존 `marked` 재활용) | Tiptap/Milkdown (무거움) |
| **역방향 프록시** | **Cloudflare Tunnel** (Windows 에서 가장 쉬움, 포트 포워딩 불필요, 공인 IP 불필요, 무료 HTTPS) | Caddy for Windows + 도메인 A 레코드 |
| **Windows 서비스화** | `pm2` + `pm2-windows-startup` | `NSSM` 으로 `node build/index.js` 래핑 |

> **기본 가정**: 이 문서는 **옵션 A 조합** 을 기준으로 작성되었다. 다른 조합이 선택되면 해당 Phase 의 코드 예시를 교체해야 한다.

---

## 2.5 Supabase 프로젝트 ref & MCP 연결 (에이전트용)

### 프로젝트 ref 가 뭐냐?

**프로젝트 ref**(Reference ID)는 Supabase 가 프로젝트마다 부여하는 **짧은 고유 문자열**이다. 대시보드 주소·API URL·CLI·MCP 에서 같은 값으로 쓰인다.

- **대시보드 URL**: `https://supabase.com/dashboard/project/<ref>`
- **REST / Auth / Realtime API 베이스**: `https://<ref>.supabase.co`
- **Settings → General** 에서 **Reference ID** 또는 **Project ID** 로 표시되는 경우가 많다. (대시보드 버전에 따라 라벨이 다를 수 있음. **URL 의 `/project/` 뒤 세그먼트**가 가장 확실하다.)

예: ref 가 `vsxvwdvvavoruocqvrgl` 이면 API 는 `https://vsxvwdvvavoruocqvrgl.supabase.co` 이다.

> **UUID 와 헷갈리지 말 것**: 같은 화면에 **내부용 UUID**(예: `xxxxxxxx-xxxx-...`) 가 따로 있을 수 있다. **코드·환경변수·클라이언트에 넣는 “짧은 ref”** 는 보통 위 형태의 **20자 내외 영숫자 문자열**이다.

### `.env` 에 넣는 값과 ref

- `PUBLIC_SUPABASE_URL` = `https://<ref>.supabase.co`
- `PUBLIC_SUPABASE_ANON_KEY` = 대시보드 **Project Settings → API → anon public**
- `SUPABASE_SERVICE_ROLE_KEY` = **서버 전용**, Git 에 절대 커밋하지 말 것

ref 자체는 공개되어도 되지만(anon 키와 함께 프론트에 노출됨), **service role** 과 **DB 비밀번호** 는 비밀이다.

### Cursor 에서 Supabase MCP 쓰기 (에이전트 절차)

이 워크스페이스에는 MCP 서버 **`plugin-supabase-supabase`** 가 등록될 수 있다. 에이전트는 DB/마이그레이션/프로젝트 조회를 **수동으로 대시보드만** 하지 말고, **가능하면 MCP 로 자동화**한다.

1. **인증 필요 시**  
   MCP 상태가 “authentication required” 이면, 도구 **`mcp_auth`** 를 서버 **`plugin-supabase-supabase`** 에 대해 **인자 없이(`{}`)** 호출한다. (사용자가 브라우저/팝업으로 로그인·승인하면 이후 도구 사용 가능.)

2. **도구 호출 전 스키마 확인 (필수)**  
   도구 이름·파라미터는 버전마다 다를 수 있으므로, 호출 전에 워크스페이스의 MCP 기술서를 읽는다:  
   `~/.cursor/projects/<workspace>/mcps/plugin-supabase-supabase/tools/*.json`  
   (또는 Cursor MCP 패널에서 동일 서버의 도구 목록 확인.)

3. **Supabase 작업 공통 스킬**  
   SQL·RLS·마이그레이션·보안 검토 시 **반드시** 아래 스킬을 읽고 순서를 따른다:  
   `~/.cursor/plugins/cache/cursor-public/supabase/release_v0.1.4/skills/supabase/SKILL.md`

4. **에이전트가 사용자 대신 할 수 있는 일 (예시)**  
   프로젝트/테이블 조회, 마이그레이션 적용 제안·실행(도구 지원 시), RLS·정책 점검, 타입/스키마와 코드 정합성 확인 등. **실제 프로덕션 destructive 연산** 은 사용자 확인 후 진행.

5. **기록**  
   확정된 ref 는 아래 **§14 최종 선택** 에 적어 두고, Phase 3 진행 시 `PUBLIC_SUPABASE_URL` 과 대조한다.

---

## 3. Phase 1 — Adapter 교체 & SSR 스캐폴드

> **목표**: 빌드 결과물이 GitHub Pages 가 아닌 Node 서버로 실행되도록 기반 교체. 기능은 그대로 유지.

### 3.1 패키지 변경

```bash
npm uninstall @sveltejs/adapter-static
npm install -D @sveltejs/adapter-node
```

### 3.2 `svelte.config.js` 수정

```js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
 preprocess: vitePreprocess(),
 kit: {
  adapter: adapter({
   out: 'build',
   precompress: true,
   envPrefix: 'APP_'
  }),
  // paths.base 제거 (자체 도메인에서는 루트 경로)
  prerender: {
   handleHttpError: 'warn',
   handleMissingId: 'warn'
  }
 }
};

export default config;
```

### 3.3 프리렌더 플래그 정리

다음 파일들의 `export const prerender = true;` 를 **조건부**로 바꾼다. 기존 정적 블로그 글은 SSG 로 계속 생성해도 되지만, **레이아웃 최상단의 `prerender = true` 는 반드시 제거**해야 SSR 라우트가 동작한다.

- `src/routes/+layout.ts` → `prerender = true` **삭제**, `ssr = true` 유지
- `src/routes/blog/[...path]/+page.ts` → **삭제** 또는 `prerender = 'auto'` 로 변경
- `src/routes/projects/+page.ts` → `prerender = true` 유지 (여전히 정적이어도 OK — `'auto'` 권장)
- `src/routes/projects/[title]/+page.ts`, `+page.server.ts` → `prerender = 'auto'` 권장

> SvelteKit 규칙: `adapter-node` 에서도 `prerender = true` 인 페이지는 빌드 타임에 HTML 로 미리 생성되고, 나머지는 서버에서 렌더링된다. 혼합 가능.

### 3.4 환경 변수 스캐폴드

루트에 `.env.example` 생성 (실제 `.env` 는 `.gitignore` 에 이미 포함됐는지 확인):

```bash
# --- Server ---
PORT=3000
HOST=0.0.0.0
ORIGIN=https://saens.example.com
BODY_SIZE_LIMIT=5mb

# --- Supabase (Phase 4 에서 채움) ---
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# --- Admin ---
ADMIN_EMAIL=
```

`.gitignore` 에 `.env`, `.env.*.local` 가 없다면 추가한다.

### 3.5 `package.json` 스크립트 업데이트

```json
{
  "scripts": {
    "start": "node build",
    "build": "vite build"
  }
}
```

### 3.6 검증

```bash
npm run check
npm run build
ORIGIN=http://localhost:3000 node build   # 200 응답 확인
```

### 3.7 커밋

```
chore(ssr): adapter-static → adapter-node 교체 및 prerender 플래그 정리
```

---

## 4. Phase 2 — `handle` 훅 & 공통 서버 미들웨어

> **목표**: 이후 인증·로깅·보안 헤더가 들어갈 슬롯을 만든다.

### 4.1 `src/hooks.server.ts` 생성

```ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
 // 나중에 Supabase 세션 주입 자리
 const response = await resolve(event);
 response.headers.set('X-Content-Type-Options', 'nosniff');
 response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
 return response;
};
```

### 4.2 `src/app.d.ts` 확장

```ts
declare global {
 namespace App {
  interface Locals {
   // Phase 4 에서 supabase, session, user 추가
  }
  interface PageData {
   session?: import('@supabase/supabase-js').Session | null;
  }
 }
}
export {};
```

### 4.3 검증·커밋

`npm run check` 통과 → `feat(ssr): handle 훅 및 Locals 타입 스캐폴드` 로 커밋.

---

## 5. Phase 3 — Supabase 연결 (DB + Auth 토대)

> **사전 준비 (사용자 액션 필요)**: Supabase 프로젝트 생성 → URL/Anon Key/Service Role Key 확보 → `.env` 에 기입.
> 또는 Supabase MCP 를 사용해 에이전트가 직접 프로젝트 생성/조회. 이때 **반드시** `/Users/sanghunsong/.cursor/plugins/cache/cursor-public/supabase/release_v0.1.4/skills/supabase/SKILL.md` 스킬을 먼저 읽고 따른다.

### 5.1 패키지 설치

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 5.2 클라이언트 팩토리 생성

`src/lib/server/supabase.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestEvent } from '@sveltejs/kit';

export function createSupabaseServer(event: RequestEvent) {
 return createServerClient(
  publicEnv.PUBLIC_SUPABASE_URL,
  publicEnv.PUBLIC_SUPABASE_ANON_KEY,
  {
   cookies: {
    getAll: () => event.cookies.getAll(),
    setAll: (cookiesToSet) => {
     cookiesToSet.forEach(({ name, value, options }) =>
      event.cookies.set(name, value, { ...options, path: '/' })
     );
    }
   }
  }
 );
}
```

`src/lib/supabase.ts` (브라우저용):

```ts
import { createBrowserClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';

export const supabase = createBrowserClient(
 env.PUBLIC_SUPABASE_URL,
 env.PUBLIC_SUPABASE_ANON_KEY
);
```

### 5.3 `hooks.server.ts` 에 세션 주입

```ts
import type { Handle } from '@sveltejs/kit';
import { createSupabaseServer } from '$lib/server/supabase';

export const handle: Handle = async ({ event, resolve }) => {
 event.locals.supabase = createSupabaseServer(event);
 event.locals.safeGetSession = async () => {
  const { data: { session } } = await event.locals.supabase.auth.getSession();
  if (!session) return { session: null, user: null };
  const { data: { user }, error } = await event.locals.supabase.auth.getUser();
  if (error) return { session: null, user: null };
  return { session, user };
 };

 return resolve(event, {
  filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version'
 });
};
```

`app.d.ts` 도 실제 타입으로 채운다.

### 5.4 `+layout.server.ts` 에서 세션 노출

기존 파일에 병합:

```ts
export const load = async ({ locals }) => {
 const { session, user } = await locals.safeGetSession();
 // 기존 tracks 로직 유지
 return { session, user, tracks };
};
```

### 5.5 DB 스키마 (마이그레이션)

`supabase/migrations/0001_init.sql` 생성 후 적용: **§2.5** 절차에 따라 MCP 도구(지원 시) 또는 Supabase CLI / 대시보드 SQL Editor:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id bigserial primary key,
  slug text unique not null,
  title text not null,
  category text,
  tags text[] not null default '{}',
  content_md text not null,
  content_html text not null,
  word_count int not null default 0,
  author_id uuid not null references public.profiles(id),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id bigserial primary key,
  post_slug text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id bigint references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

-- profiles: 본인만 수정, 전체 읽기
create policy "profiles read" on public.profiles for select using (true);
create policy "profiles self-update" on public.profiles for update using (auth.uid() = id);
create policy "profiles self-insert" on public.profiles for insert with check (auth.uid() = id);

-- posts: 게시된 글은 누구나 읽기, 작성/수정은 admin 만
create policy "posts read published" on public.posts for select using (
  published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "posts admin write" on public.posts for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- comments: 로그인 사용자만 작성, 본인만 수정/삭제, 전체 읽기
create policy "comments read" on public.comments for select using (true);
create policy "comments insert" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments update own" on public.comments for update using (auth.uid() = author_id);
create policy "comments delete own" on public.comments for delete using (auth.uid() = author_id);

-- 가입 시 profile 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, split_part(new.email, '@', 1), split_part(new.email, '@', 1));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 5.6 검증·커밋

`npm run check` → `feat(auth): Supabase SSR 클라이언트·RLS 스키마 추가`.

---

## 6. Phase 4 — Auth UI (로그인/회원가입/로그아웃)

> **컨벤션**: `.cursor/rules/sveltekit-conventions.mdc` 의 **form actions** 패턴을 사용한다. `fetch` 로 직접 호출하지 말 것.

### 6.1 라우트 구조

```
src/routes/
  (auth)/
    login/
      +page.svelte
      +page.server.ts
    signup/
      +page.svelte
      +page.server.ts
  logout/+page.server.ts      # action only
  account/+page.svelte        # 로그인 필요
  account/+page.server.ts
```

### 6.2 로그인 action 예시

`src/routes/(auth)/login/+page.server.ts`:

```ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
 default: async ({ request, locals, url }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');
  const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
  if (error) return fail(400, { email, message: error.message });
  throw redirect(303, url.searchParams.get('next') ?? '/');
 }
};
```

### 6.3 보호 가드

`src/routes/admin/+layout.server.ts`, `src/routes/account/+layout.server.ts` 등 보호가 필요한 곳에:

```ts
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, url }) => {
 const { session, user } = await locals.safeGetSession();
 if (!session) throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
 return { user };
};
```

### 6.4 네비게이션에 로그인 상태 표시

`src/routes/+layout.svelte` 의 nav 에 아바타/로그인 버튼 추가. 기존 runes + 테마 변수 스타일을 유지하고 `$props().data.user` 로 접근.

### 6.5 검증·커밋

브라우저에서 회원가입 → 로그인 → 로그아웃 플로우 확인. `feat(auth): 로그인·회원가입·로그아웃 플로우`.

---

## 7. Phase 5 — 블로그 작성/수정/삭제 (관리자)

### 7.1 라우트 추가

```
src/routes/
  admin/
    +layout.server.ts           # role === 'admin' 가드
    posts/
      +page.svelte              # 글 목록(초안 포함)
      +page.server.ts
      new/+page.svelte
      new/+page.server.ts       # form action: create
      [slug]/edit/+page.svelte
      [slug]/edit/+page.server.ts  # form actions: update, delete, publish
```

### 7.2 서비스 레이어

`src/lib/server/posts.ts` (신규) — Supabase CRUD 를 캡슐화. `marked` 로 `content_md` → `content_html` 변환은 **서버에서** 수행하고 DB 에 저장. 기존 `src/lib/server/blog.ts` 의 `marked` 설정을 재사용하도록 공용 모듈 `src/lib/server/markdown.ts` 로 추출.

### 7.3 하이브리드 로더

`src/routes/blog/[...path]/+page.server.ts` 를 수정:

1. 먼저 Supabase `posts` 테이블에서 slug 매칭 시도 (published=true 또는 admin 일 때 draft 포함)
2. 없으면 기존 `getBlogPost(path)` 로 파일 시스템 fallback
3. 카테고리 페이지에서는 파일 시스템 목록 + DB 게시글을 **merge 후 날짜 정렬**

`export const entries` 는 **제거** (SSR 이므로 불필요). 대신 파일 시스템 글은 자연스럽게 SSR 에서 렌더되고, 필요시 특정 경로만 `prerender = 'auto'` 로 캐시 유도.

### 7.4 에디터 UI

간단한 2-컬럼: 좌측 `<textarea>` (markdown), 우측 실시간 프리뷰.

- 프리뷰는 클라이언트에서 `marked` 동기 호출 (`src/lib/markdown.client.ts` 분리)
- 저장은 form action (progressive enhancement: JS 꺼져도 동작)
- runes 사용: `let md = $state('')`, `let html = $derived(marked(md))`

### 7.5 검증·커밋

글 작성 → 목록 노출 → 수정 → 삭제 → 공개/비공개 토글. `feat(blog): 관리자 글 작성·수정·삭제`.

---

## 8. Phase 6 — 댓글

### 8.1 컴포넌트

`src/lib/components/Comments.svelte` — 블로그 글 하단에 렌더.

Props: `postSlug: string`, `initialComments: Comment[]`.

기능:

- 로그인 상태면 작성 폼 표시, 아니면 "로그인하고 댓글 작성" 링크
- 대댓글 1-depth (선택)
- 본인 댓글 수정/삭제
- **Realtime**: `supabase.channel('comments:' + postSlug).on('postgres_changes', ...).subscribe()` 로 실시간 갱신

### 8.2 데이터 로딩

`src/routes/blog/[...path]/+page.server.ts` 의 `isPost` 분기에서:

```ts
const { data: comments } = await locals.supabase
 .from('comments')
 .select('id, content, author_id, parent_id, created_at, profiles(username, avatar_url)')
 .eq('post_slug', path)
 .order('created_at', { ascending: true });
```

### 8.3 서브밋 endpoint

`src/routes/blog/[...path]/+page.server.ts` 에 `actions: { addComment, deleteComment, editComment }` 추가. RLS 가 검증을 담당하므로 서버 코드는 얇게.

### 8.4 검증·커밋

`feat(comments): 글 상세 댓글 + Realtime 구독`.

---

## 9. Phase 7 (선택) — 파일 기반 글을 DB 로 이관

> **권장**: 당장 하지 않는다. 필요해지면.

### 9.1 이관 스크립트

`scripts/migrate-md-to-db.ts` — `src/lib/blog/` 를 재귀 순회하며 `getBlogPost` 를 호출하고 Supabase `posts` 테이블에 upsert. Service Role Key 사용.

### 9.2 이관 후 fallback 제거

Phase 5 의 하이브리드 로더에서 파일 시스템 분기를 제거하고 DB 단일 소스로 전환.

---

## 10. Phase 8 — Windows PC 배포

### 10.1 Node 설치

- Node.js **LTS (>= 20)** 설치. `node -v`, `npm -v` 확인.
- Git for Windows 설치.

### 10.2 저장소 배치

```powershell
# PowerShell
cd C:\srv
git clone <repo-url> saenslog
cd saenslog
npm ci
npm run build
```

### 10.3 `.env.production` 작성 (서비스 계정이 읽을 위치)

```
PORT=3000
HOST=0.0.0.0
ORIGIN=https://<사용자-도메인>
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 10.4 서비스화 (pm2 방식, 권장)

```powershell
npm install -g pm2 pm2-windows-startup
pm2 start build/index.js --name saenslog --update-env
pm2 save
pm2-startup install   # Windows 부팅 시 자동 시작
```

검증: `pm2 status`, `pm2 logs saenslog`.

### 10.5 외부 공개 — Cloudflare Tunnel (권장)

포트포워딩/공인 IP 불필요, HTTPS 자동.

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com) → Networks → Tunnels → **Create a tunnel** → `cloudflared` 선택
2. Windows 용 `cloudflared` 설치 후 제공된 토큰으로 서비스 등록:

   ```powershell
   cloudflared.exe service install <token>
   ```

3. Public Hostname 추가: `saens.example.com` → `http://localhost:3000`
4. `.env.production` 의 `ORIGIN` 을 해당 도메인으로 업데이트 → `pm2 restart saenslog`.

### 10.6 대안: Caddy for Windows + 도메인 A 레코드

공유기 80/443 포트포워딩 가능할 때만:

`Caddyfile`:

```
saens.example.com {
 reverse_proxy 127.0.0.1:3000
}
```

```powershell
caddy.exe start
```

### 10.7 Windows 방화벽

- **외부에서 직접 접근 허용하지 않는다** (Tunnel 사용 시). 인바운드 3000 차단 유지.
- Caddy 경로일 때만 80/443 인바운드 허용.

### 10.8 배포 자동화

자체 호스팅이므로 GitHub Actions 에서 Self-hosted Runner 를 Windows PC 에 설치하거나, 단순히 다음 스크립트를 수동 실행:

`scripts/deploy.ps1`:

```powershell
cd C:\srv\saenslog
git pull --ff-only
npm ci
npm run build
pm2 restart saenslog --update-env
```

`.github/workflows/deploy.yml` 은 **삭제 또는 disable** (GitHub Pages 배포는 더 이상 사용 안 함). 대신 CI 용 `check.yml` 만 남기기:

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run check
      - run: npm run lint
      - run: npm run build
```

---

## 11. Phase 9 — 운영 안정화 체크리스트

- [ ] `ORIGIN` 이 실제 도메인과 일치 (CSRF 방지)
- [ ] `BODY_SIZE_LIMIT` 을 이미지/글 크기에 맞게 조정
- [ ] `pm2 logs` 로그 로테이션 설정 (`pm2 install pm2-logrotate`)
- [ ] Supabase **Email Rate Limit**, **reCAPTCHA** 또는 Turnstile 연결
- [ ] 블로그 글 `content_html` 에 대한 **XSS 방어** — `marked` + `DOMPurify` 서버사이드 추가 검토 (특히 외부 회원 콘텐츠인 댓글은 반드시 sanitize)
- [ ] Windows PC 절전/슬립 비활성화 (`powercfg /change standby-timeout-ac 0`)
- [ ] UPS 또는 정기 백업 스케줄 (`pg_dump` via Supabase 대시보드)
- [ ] **SEO**: §12 Phase 10 체크리스트 (사이트맵·메타·콘솔 등록)

---

## 12. Phase 10 — SEO (검색 노출)

> **현재 베이스라인 (에이전트가 코드 확인 시 검증)**  
>
> - `static/robots.txt`: `User-agent` / `Disallow` 만 있고 **`Sitemap:` 라인 없음**  
> - **`sitemap.xml` 없음** (정적·라우트 모두 미구현)  
> - `src/routes/+layout.svelte` 의 `<svelte:head>` 에 전역 `<title>SAENS</title>` 만 있음  
> - `src/routes/blog/[...path]/+page.svelte` 에 **글·목록별 `title` / `description` / `canonical` / OG / Twitter 카드** 가 거의 없음 → 검색·SNS 미리보기 최적화 여지 큼  
> Phase 5(하이브리드 블로그: 파일 + DB) 이후 **사이트맵 URL 목록** 에 DB 글 slug 도 포함해야 한다. Phase 10 은 **배포 직전~직후**에 수행해도 되고, 블로그 라우트가 안정화된 뒤 한 번에 묶어도 된다.

**canonical 베이스 URL**: §14 최종 선택에 적은 도메인(예: `https://saens.kr`)과 일치해야 한다. 코드에서는 `ORIGIN` 또는 `PUBLIC_SITE_URL` 같은 **단일 환경 변수**로 통일하고, trailing slash 정책(권장: **끝에 슬래시 없음**)을 전역과 사이트맵·canonical 에 동일하게 적용한다.

### 12.1 코드에서 먼저 할 SEO (에이전트 구현 체크리스트)

#### A. `sitemap.xml` (최우선)

- **목표**: 홈, 주요 정적 경로, **모든 블로그 카테고리·글 URL** 을 포함한 XML. DB 에 저장되는 글(Phase 5 이후)은 **발행된 slug** 만 포함.
- **구현 옵션** (택일 또는 병행, 프로젝트 상태에 맞게 선택):
  1. **동적 라우트 (SSR/adapter-node 권장)**: `src/routes/sitemap.xml/+server.ts` 에서 `GET` 으로 `application/xml` 응답. 서버에서 `getBlogItems` 재귀 + `getAllPosts` (또는 DB `posts` 조회)로 URL 목록 생성. **항상 최신**이므로 신규 글 반영에 유리.
  2. **빌드 시 정적 파일**: prerender 가 남아 있으면 hooks 로 빌드 시 생성해 `static/sitemap.xml` 에 쓰기 — DB 글은 **배포 후 갱신이 안 될 수 있어** SSR 에서는 1)을 우선.
- `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` 표준 준수, `<loc>` 는 절대 URL (`https://saens.kr/...`).
- `lastmod` 는 글 `updated_at` 또는 frontmatter `date` 가 있으면 ISO8601 로 넣는 것을 권장.

#### B. `robots.txt` 보강

- 현재: 주석 + `User-agent: *` + `Disallow:` 만 존재.
- **추가 권장**:
  - `Allow: /` (명시)
  - `Sitemap: https://saens.kr/sitemap.xml` (실제 도메인으로 교체)
- **배치**:
  - 정적 파일 `static/robots.txt` 를 수정하거나,
  - 사이트맵과 같이 `src/routes/robots.txt/+server.ts` 로 동적 생성해 **환경별 도메인**에 맞추기 (스테이징/프로덕션 분리 시 유리).

#### C. 페이지별 `<svelte:head>` (블로그 우선)

**적용 위치**: `src/routes/blog/[...path]/+page.svelte` (및 필요 시 목록·홈·프로젝트).

글 상세(`data.isPost === true`)일 때 최소 포함:

| 항목 | 비고 |
|------|------|
| `<title>` | `{글 제목} | SAENS` 등 일관된 패턴 |
| `<meta name="description">` | 본문 첫 문단 또는 frontmatter `description` (없으면 제목 기반 짧은 요약, **중복·스팸 금지**) |
| `<link rel="canonical" href="...">` | 절대 URL, 쿼리스트립 제거 |
| `og:title`, `og:description`, `og:url`, `og:type` | 글은 `article` |
| `og:image` | 대표 이미지가 있으면 절대 URL (없으면 생략 또는 기본 OG 이미지) |
| `twitter:card` | `summary` 또는 `summary_large_image` |
| `twitter:title`, `twitter:description` | OG 와 동일해도 됨 |

**데이터 공급**: `+page.server.ts` 의 `load` 에서 `description`, `ogImage` 등을 계산해 `PageData` 로 넘기면 템플릿이 단순해진다. DB 글(Phase 5)은 메타 필드를 테이블에 두거나 첫 N 글자로 생성.

**전역 레이아웃**: `+layout.svelte` 의 고정 `<title>SAENS</title>` 는 **하위 페이지가 덮어쓰도록** 조정하거나, 레이아웃에서는 `title` 만 두고 실제 문자열은 자식에서 설정 (SvelteKit 은 깊은 라우트의 `svelte:head` 가 병합됨 — 중복 title 태그가 생기지 않게 한 곳에서만 `<title>` 정의).

#### D. 구조화 데이터 JSON-LD (권장)

- 글 페이지에 `<script type="application/ld+json">` 로 **BlogPosting** (또는 `Article`) 스키마 삽입.
- 필드 예: `@context`, `@type`, `headline`, `datePublished`, `dateModified`, `author`, `mainEntityOfPage` (`@id` = canonical URL).
- 내용은 **이스케이프된 JSON** 문자열로 삽입; 사용자 입력이 스크립트에 직접 들어가면 XSS 위험이 있으므로 **서버에서 직렬화**하거나 신뢰할 수 있는 필드만 사용.

### 12.2 플랫폼별 등록 (사용자 작업, 에이전트는 안내)

1. **Google**  
   - [Google Search Console](https://search.google.com/search-console) 에 `https://saens.kr` 등록 및 소유권 인증  
   - `sitemap.xml` 제출  
   - 신규 글: URL 검사 → 색인 생성 요청

2. **네이버**  
   - [네이버 서치어드바이저](https://searchadvisor.naver.com/) 사이트 등록·소유권 인증  
   - 사이트맵 제출: `https://saens.kr/sitemap.xml`  
   - 필요 시 **웹페이지 수집 요청**으로 신규 URL 제출

3. **다음(Daum)**  
   - [다음 웹마스터도구](https://search.daum.net/searchw) 등록  
   - PIN/인증 안내에 따라 **`robots.txt` 에 특정 라인 추가** 등 요구사항 반영 (에이전트는 사용자가 받은 값을 `robots.txt` 에 반영하도록 코드 수정)

### 12.3 배포 후 즉시 확인 (체크리스트)

- [ ] `https://saens.kr/robots.txt` — 열리고 `Sitemap:` 행이 기대 URL 인지 확인  
- [ ] `https://saens.kr/sitemap.xml` — HTTP 200, XML 유효, 블로그·카테고리 URL 포함  
- [ ] 글 상세 **페이지 소스**(또는 요소 검사 아닌 “보기 소스”)에서 `title`, `description`, `canonical`, `og:*` 존재 확인  
- [ ] 주기적으로 `site:saens.kr` 등으로 색인 상태 확인  

### 12.4 검증·커밋

```bash
npm run check
curl -sI https://saens.kr/sitemap.xml   # 배포 환경에서
```

커밋 예: `feat(seo): sitemap, robots, 블로그 메타/OG/JSON-LD`

---

## 13. 롤백 전략

각 Phase 는 독립 커밋이므로 `git revert <sha>` 로 개별 롤백 가능.
특히 Phase 1 (adapter 교체) 롤백 시:

```bash
git revert <phase1-sha>
npm install
npm run build
```

→ GitHub Pages 배포가 다시 동작한다.

DB 롤백: Supabase 대시보드 → Migrations → Revert, 또는 백업 snapshot 복원.

---

## 14. 최종 선택 (사용자 확정 후 여기에 기록)

- [x] Adapter: `adapter-node`
- [x] DB / Auth: `Supabase (cloud)`
- [x] 댓글: `Supabase + Realtime`
- [x] 프록시: `Cloudflare Tunnel`
- [x] 서비스화: `pm2 + pm2-windows-startup`
- [x] 도메인: `saens.kr`
- [x] Supabase 프로젝트 ref: `vsxvwdvvavoruocqvrgl`

---

## 15. AI 에이전트 작업 순서 요약 (TL;DR)

1. 본 문서 §2 의사결정을 사용자에게 확인 → §14 에 체크
2. **§2.5**: Supabase MCP — 필요 시 `mcp_auth` 로 `plugin-supabase-supabase` 인증 → `mcps/.../tools/*.json` 으로 도구 스키마 확인 → Supabase 스킬(`supabase/SKILL.md`) 준수
3. Phase 1 실행 → 커밋 → `npm run build` 성공 확인
4. Phase 2 실행 → 커밋
5. Supabase 프로젝트 준비 확인 (URL·anon 키·ref 가 §14·`.env` 와 일치하는지)
6. Phase 3 실행 → 커밋 (마이그레이션·스키마 작업은 **MCP 도구가 있으면 MCP 우선**, 없으면 대시보드 SQL 또는 Supabase CLI)
7. Phase 4 → 커밋 → 로그인 수동 테스트
8. Phase 5 → 커밋 → 글 작성 수동 테스트
9. Phase 6 → 커밋 → 댓글/Realtime 수동 테스트
10. Phase 8 을 사용자와 함께 Windows PC 에서 실행 (에이전트는 스크립트·문서 준비만)
11. Phase 9 체크리스트 소진
12. **§12 Phase 10** — 사이트맵·robots·블로그 메타/OG/JSON-LD 구현 → 배포 후 §12.3 검증; 검색 콘솔 등록은 사용자(§12.2)

각 Phase 끝에는 **반드시** `npm run check` + `npm run build` 를 통과시키고, `.cursor/skills/commit/SKILL.md` 규칙대로 커밋/푸시한다.
