# 배포 (Cloudflare Workers)

```sh
npm run deploy   # vite build + wrangler deploy
```

## 로컬

```sh
npm run dev      # vite dev (미디어는 static/에서 직접 서빙)
npm run preview  # 빌드 후 wrangler dev (Workers 런타임 시뮬레이션)
```

## 1회성 설정

- `wrangler login` — Cloudflare 인증
- 대시보드에서 R2 활성화 후 `saenslog-media` 버킷 생성
- `scripts/upload-media-to-r2.sh` — static/blog·static/musics 미디어를 R2로 업로드
- `npx wrangler secret put SUPABASE_SECRET_KEY` — 프로덕션 시크릿 등록
- `.dev.vars` — wrangler dev용 시크릿 (gitignore됨)

미디어(blog/·musics/)는 R2에서 서빙되며 `static/.assetsignore`로 정적 에셋 업로드에서 제외된다.
