# PLAN-OPTIMIZATION.md

Runtime performance plan for the blog on Cloudflare Workers.

## Problem

Every blog request runs SSR and makes 6–7 Supabase round-trips on the critical
path. Supabase lives in a single region; Workers run at the edge — so each
render pays the edge→region latency, even though the post body and folder tree
are nearly static. Media is already edge-cached (R2 + Cache API); this plan
applies the same idea to page data.

## Scope

Three of the four optimizations, in dependency order:

- **#4 — Move view-count increment off the critical path** (prerequisite, smallest)
- **#1 — Edge-cache the static "shell" HTML/data via Cache API**
- **#3 — Cache the folder tree (`fetchAllFolders`) in KV**

(#2 prerender is intentionally excluded — it conflicts with #1 and does not fit
DB-backed, frequently-edited posts.)

## Guiding principle: static ↔ dynamic split

`src/routes/blog/[...path]/+page.server.ts` currently returns one payload that
mixes cacheable data with per-viewer data. The whole plan rests on separating them.

| Cacheable (viewer/time-independent) | NOT cacheable (personalized / live) |
| --- | --- |
| post body HTML (`content_html`) | auth state / `isAdmin` edit UI |
| folder tree, breadcrumb, tags | comments list |
| title / dates / word count | like count + `likedByViewer` |
| | view count |

Rule applied to every cache below: **visitors get the cache; admin bypasses to
live DB.** `isAdmin` is already computed (`isAdminPromise`), so the branch point
already exists.

---

## #4 — View-count increment off the critical path (do first)

**Why first:** caching the shell HTML (#1) is impossible while the render awaits
`increment_post_view`. This change is a prerequisite and stands alone.

Current: `+page.server.ts:306-314` — `viewCountPromise` calls
`rpc('increment_post_view')` and is awaited inside the `Promise.all` at line
316-325, so the write is on the render path.

### Subworks

- **4a.** In `+page.server.ts` load, stop awaiting the increment. Read the
  current `view_count` from the already-fetched `postPromise` row for display;
  do not block on the RPC result.
- **4b.** Fire the increment as a background task via the platform `waitUntil`.
  Get the handle from `event.platform.context.waitUntil` (Cloudflare adapter);
  thread `platform` into the `load` signature. Wrap the RPC so a failure only
  logs (keep the existing `console.warn`).
- **4c.** Remove `viewCountPromise` from the `Promise.all` array (line 316-325)
  so it is no longer a critical-path await.
- **4d.** Accept the trade-off: the number shown is the pre-increment value (off
  by one for the current viewer). If exact live count matters, fetch it
  client-side after mount instead (see #1's dynamic island).
- **4e.** Verify locally: load a post, confirm TTFB drops and the count still
  increments on the next load.

---

## #1 — Edge-cache the static shell via Cache API (do second)

Goal: a cached, viewer-neutral response for `/blog/<id>` and listing pages,
served from `caches.default` at the edge, with personalized bits hydrated
client-side. Mirror the media-caching pattern already in `hooks.server.ts`.

### Decision to lock first

- **1a.** Choose the cache surface. Two options:
  - **Data-layer cache** — memoize the cacheable half of the load payload (post
    body HTML + folder/breadcrumb/tags) keyed by post id, and only query
    Supabase for the dynamic half. Simpler, keeps SSR.
  - **Full-response cache** — cache the rendered HTML response in `caches.default`
    keyed by URL, and load comments/likes/views via client fetch. Fastest TTFB,
    bigger refactor.
  Recommend starting with the **data-layer cache** (less risk), then escalating
  to full-response if TTFB is still high. Pick one before coding.

### Subworks — split the load

- **1b.** In `+page.server.ts:349-381`, classify each returned field as
  **static** or **dynamic** per the table above.
- **1c.** Move dynamic fields (`comments`, `postLikeCount`, `postLikedByViewer`,
  `commentLikesById`, live `viewCount`) out of the SSR payload and into
  client-side fetches. Add small API routes (e.g.
  `src/routes/api/posts/[id]/comments/+server.ts`,
  `.../likes/+server.ts`) that return JSON, called from the post page component
  after mount (dynamic islands).
- **1d.** Keep static fields (`content`, `title`, dates, `tags`, `breadcrumb`,
  `category`, `wordCount`, `seo`) in the SSR payload — this becomes the
  cacheable shell.

### Subworks — add the cache

- **1e.** Write a small cache helper (new file, e.g.
  `src/lib/server/edgeCache.ts`) wrapping `caches.default` (`.match` / `.put`),
  matching the style already used for media in `hooks.server.ts`. Add a TTL via
  `Cache-Control` (e.g. `s-maxage=300`) plus an explicit-invalidation path.
- **1f.** In the post `load` (or the chosen surface from 1a), wrap the static
  shell fetch: on cache hit return cached; on miss query Supabase, build the
  shell, `cache.put`, return.
- **1g.** **Admin bypass:** if `isAdmin`, skip the cache entirely (read + write
  paths) so the author always sees live edits.
- **1h.** **Invalidation on write.** The post mutation actions live in the same
  file (`actions`, `+page.server.ts:427+`). After any action that changes a
  post's content or publish state (save/update, `deletePost` at ~895, publish
  toggle), delete that post's cache entry. Also bust on the admin save route if
  separate.
- **1i.** Decide cache key shape: include post id and a content version/`updated_at`
  if available, so stale entries fall out naturally even if an invalidation is missed.

### Subworks — apply to listing pages

- **1j.** Repeat the shell/dynamic split for the listing routes: root `/blog`
  (line 396-422) and `/blog/f/{id}` (line 385-393). The folder listing + post
  cards are static; only admin controls are dynamic. Cache the listing shell with
  the same helper and admin-bypass rule.

### Verify

- **1k.** Confirm: visitor hits show `cf-cache-status`/served-from-cache fast
  path; admin always sees live; editing a post and reloading as a visitor shows
  the update after invalidation.

---

## #3 — Cache the folder tree in KV (do third)

`fetchAllFolders` (`src/lib/server/folders.ts`) runs a full
`folders` SELECT on every request — load (line 275) and three actions
(`movePost` ~823, `createFolder` ~870, `deletePost` ~895). The tree only changes
on admin folder actions, so it is highly cacheable.

### Subworks

- **3a.** Add a KV namespace binding (e.g. `FOLDERS`) to `wrangler.jsonc` under
  `kv_namespaces`, and create the namespace via wrangler. Add the type to the
  app's `App.Platform` env declaration.
- **3b.** Add a cached wrapper, e.g. `fetchAllFoldersCached(platform, supabase)`
  in `folders.ts`: read `FOLDERS.get('tree', 'json')`; on miss call the existing
  `fetchAllFolders`, then `FOLDERS.put('tree', JSON.stringify(rows))`.
- **3c.** **Read path:** in `+page.server.ts:275`, use the cached wrapper for
  visitors. **Admin bypass:** when `isAdmin`, call the raw `fetchAllFolders` so
  the author sees live structure (avoids KV eventual-consistency lag right after
  a folder edit).
- **3d.** **Invalidation:** after `createFolderUnderParent` (~877),
  `movePostToFolder` (~829), and `removePostFromAllFolders` (~896), call
  `FOLDERS.delete('tree')` so the next read repopulates.
- **3e.** Optional safety net: also set a short KV TTL (e.g. 300s) so a missed
  invalidation self-heals.
- **3f.** Keep the existing in-tree JS computations (`findFolderContainingPost`,
  `countDescendantFolders`, `collectDescendantPostIds`) as-is for now; caching the
  fetch removes the DB round-trip, which is the dominant cost. (Revisit the
  O(folders×posts) traversal separately only if CPU time becomes the limit.)
- **3g.** Verify: visitor blog loads no longer issue a `folders` SELECT (check
  observability); creating/moving/deleting a folder is reflected on the next
  visitor load.

---

## Suggested order & checkpoints

1. **#4** (small, unblocks #1) → measure TTFB.
2. **#1** static/dynamic split → then add Cache API → measure again.
3. **#3** folder KV cache → measure DB query count.

After each step, check Workers observability for query count and latency before
moving on. Land each as its own commit/PR.

## Cross-cutting checklist

- [x] Every cache (shell, folder tree) has: visitor-reads-cache, admin-bypass,
      write-invalidation, and a TTL fallback.
- [x] No personalized data (auth, likes-by-viewer, comments) ever enters a
      shared cache entry.
- [x] All invalidation points are in the `actions` block of
      `+page.server.ts` plus the admin save path — audit that none are missed.
- [x] `platform`/`waitUntil` threaded through the `load` signatures that need it.

---

## 구현 현황 (2026-06-23)

세 항목 모두 코드 반영 완료. 빌드(`npm run build`)·타입체크(`svelte-check`)·유닛테스트 통과.

- **#4 조회수 분리** — 완료(`increment_post_view`를 `waitUntil` 백그라운드로, `Promise.all`에서 제거).
- **#3 폴더 트리 KV 캐시** — 완료(`fetchAllFoldersCached`, admin 우회, 무효화 3+1곳, TTL 300s).
  - 이번에 **`FOLDERS` KV 네임스페이스 실제 생성**(id `763d6e949ca8450fb1402f72dd698926`)하여
    `wrangler.jsonc`의 `REPLACE_WITH_KV_NAMESPACE_ID` placeholder를 채움.
  - admin 글 삭제 경로(`admin/posts/[id]/edit` `delete`)에 빠져 있던 `invalidateFoldersCache()` 보강.
- **#1 정적 셸 엣지 캐시** — 완료. 1a 결정은 **데이터-레이어 캐시**(SSR 유지, 저위험) 채택.
  - 새 헬퍼 `src/lib/server/edgeCache.ts` (`caches.default` 래퍼, JSON I/O, `s-maxage` TTL, 무효화).
  - 글 상세: 정적 셸(본문 HTML·브레드크럼·태그·SEO)만 캐시, 동적(댓글·좋아요·조회수)은 매 요청 라이브.
    admin 우회. 키 `post:v1:<id>`.
  - 리스팅(`/blog`, `/blog/f/<id>`): `loadListingCached` 래퍼로 동일 적용. 키 `listing:v1:root` / `…:f:<id>`.
  - 무효화: 글 저장·수정(admin save/autosave)·삭제·이동·신규, 폴더 생성 시 해당 셸/리스팅 키 삭제.

### 의도적으로 안 한 것 (결정 사항, 블로커 아님)

- **#1 풀-리스폰스 캐시 / 클라이언트 아일랜드(1c)** — 계획서 1a 권장대로 데이터-레이어 캐시부터 적용.
  배포 후 TTFB가 여전히 높으면 그때 댓글·좋아요를 API 라우트 + 클라이언트 fetch로 분리하여 에스컬레이션.
- **#2 prerender** — 계획서대로 제외.

---

## ⚠️ 남은 수동 작업 — 사용자만 가능 (내가 못 하는 것)

코드/인프라(KV 생성)는 끝났지만, 아래는 권한·검증 성격상 직접 해주셔야 합니다.

1. **배포** — 코드와 KV 바인딩이 준비됐으나 배포는 내가 하지 않았습니다(외부 반영 작업).
   `wrangler deploy` 실행(또는 Workers Builds 연동 시 푸시). KV는 prod 계정에 이미 생성됨.
2. **커밋/푸시** — 아직 커밋 안 함. (참고: 이 환경에선 VS Code askpass로 `git push`가 멈춰
   gh 토큰으로 푸시해야 함 — `git-push-askpass-workaround` 메모 참고.)
3. **KV 계정 확인** — 생성 직전 `kv_namespaces_list`가 비어 있었습니다. MCP가 의도한 그 계정에
   붙어 있는지(생성된 id `763d6e94…`가 prod와 동일 계정인지) 대시보드에서 한 번 확인 권장.
   다른 계정이면 prod 계정에서 KV를 다시 만들고 id를 교체해야 합니다.
4. **프로덕션 검증(1k·3g)** — 배포 후에만 가능:
   - 방문자 요청에 `cf-cache-status` HIT 확인, admin은 항상 라이브.
   - 글 수정 → 방문자 재로딩 시 반영(같은 colo 기준 즉시, 타 colo는 최대 TTL 300s).
   - Workers 옵저버빌리티에서 글 로드 시 `folders`/`posts` SELECT 감소 및 TTFB 측정.
5. **(알아둘 한계, 조치 불필요)** `caches.default`는 **colo(데이터센터)별**이라 무효화가
   전역 즉시 반영되지 않습니다. 누락분은 TTL 300s로 자가복구합니다. 폴더 *이름 변경*은 별도
   액션이 없어 글 셸의 태그/브레드크럼이 TTL까지 지연될 수 있습니다(저빈도, 허용 범위).
