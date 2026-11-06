/* LIKHA 런타임 설정 — 공개해도 되는 값만. (시크릿 키는 절대 여기 넣지 말 것: Vercel 환경변수에만)
   비워두면 데모 모드(브라우저 localStorage)로 동작하고, 채우면 실서비스 모드(Supabase + Toss + Vercel API)로 전환됩니다. */
window.LIKHA_CONFIG = {
  SUPABASE_URL: "",            // 예: https://abcdefgh.supabase.co   (Supabase → Project Settings → API)
  SUPABASE_ANON_KEY: "",       // 예: eyJhbGciOi...                  (anon public key — 공개용, RLS로 보호됨)
  TOSS_CLIENT_KEY: "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm",  // 결제위젯 클라이언트 키 (test_gck_ → live_gck_)
  API_BASE: "/api",            // Vercel 서버리스 함수 경로. GitHub Pages 등 정적 호스팅이면 Vercel 주소: "https://likha.vercel.app/api"
  SITE_NAME: "LIKHA"
};
window.LIKHA_LIVE = !!(window.LIKHA_CONFIG.SUPABASE_URL && window.LIKHA_CONFIG.SUPABASE_ANON_KEY);
