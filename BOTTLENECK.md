# 병목 후보

1. 매 요청 SSR : 루트 +layout.server.ts: getUser + getSession 이중 호출, 로그인 시 profiles 조회, readdirSync

2. 첫 화면(클라이언트) : 루트 레이아웃의 다중 @fontsource + highlight 테마 CSS