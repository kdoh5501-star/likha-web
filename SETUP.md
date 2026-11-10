# LIKHA 실서비스 전환 가이드

지금 사이트는 **데모 모드**로 돌아갑니다 (브라우저 localStorage). 아래 키를 넣는 순간 **실서비스 모드**(구글 로그인 · DB · 실시간 채팅 · 토스 결제 승인)로 바뀝니다. 코드 수정은 필요 없고, 키 4개와 SQL 한 번이 전부입니다.

## 전체 구조

```
고객 (index.html) ──┐                          ┌── Toss Payments (결제)
크리에이터 (creator.html) ─┼── Supabase ──────────┤   · api/confirm.js  (Vercel, 시크릿 키로 승인 → DB에 paid)
PM (admin.html) ────┘   · Auth (Google/Kakao/이메일)   └── DeepL (번역)
                        · Postgres (주문·작업·메시지·알림·정산)   · api/translate.js (PM 한국어 ↔ EN/TL)
                        · Realtime (채팅·알림 즉시 반영)
                        · Storage (원본·납품 파일)
```

- 고객은 **원화 판매가만**, 크리에이터는 **페소 작업비만** 봅니다. DB 권한(RLS)으로 강제되어 있어서 코드 실수로도 섞이지 않습니다.
- 서버 코드는 `api/` 두 파일뿐. 나머지는 Supabase가 처리합니다.

## 1. Supabase (DB + 로그인) — 15분

1. https://supabase.com → New project (리전: **Northeast Asia (Seoul)**, 무료 플랜 OK)
2. 좌측 **SQL Editor** → `supabase/schema.sql` 내용 전체 붙여넣고 Run. (테이블·권한·트리거·스토리지 한 번에 생성)
3. **Project Settings → API** 에서 복사:
   - `Project URL` → `assets/js/config.js` 의 `SUPABASE_URL`
   - `anon public` 키 → `SUPABASE_ANON_KEY`
   - `service_role` 키 → **Vercel 환경변수에만** (`SUPABASE_SERVICE_ROLE_KEY`). 절대 config.js에 넣지 말 것.
4. **Authentication → URL Configuration**
   - Site URL: `https://likha.co.kr` (도메인 전이면 Vercel 주소)
   - Redirect URLs: `https://likha.co.kr/**`, `https://likha.co.kr/creator.html`, `https://likha.co.kr/admin.html`, `http://localhost:8787/**`

## 2. 구글 로그인 — 10분

1. https://console.cloud.google.com → 프로젝트 생성 → **APIs & Services → OAuth consent screen** (External, 앱 이름 LIKHA, 로고·개인정보처리방침 URL)
2. **Credentials → Create → OAuth client ID → Web application**
   - Authorized JavaScript origins: `https://likha.co.kr`, `http://localhost:8787`
   - Authorized redirect URIs: `https://<프로젝트>.supabase.co/auth/v1/callback`  ← Supabase Auth → Providers → Google 화면에 적혀 있음
3. 발급된 **Client ID / Client Secret** 을 Supabase → **Authentication → Providers → Google** 에 입력, Enable.
4. (선택) 카카오: Supabase Providers → Kakao. 카카오 개발자센터 REST API 키 + Client Secret. 고객(한국)용으로 유용.

첫 로그인 후 본인 계정을 관리자로:
```sql
update profiles set role = 'admin' where email = 'yko0107@gmail.com';
```
PM 추가: `update profiles set role = 'pm' where email = 'pm@example.com';`

## 3. Vercel (호스팅 + 서버 함수) — 10분

1. https://vercel.com → Add New → Project → GitHub `kdoh5501-star/likha-web` import (Framework: Other, Build 없음)
2. **Settings → Environment Variables** (`.env.example` 참고):
   | 이름 | 값 |
   |---|---|
   | `TOSS_SECRET_KEY` | 토스 개발자센터 → 결제위젯 연동 키 → 시크릿 (test_gsk_ → 심사 후 live_gsk_) |
   | `SUPABASE_URL` | 1-3의 Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | 1-3의 service_role |
   | `DEEPL_API_KEY` | (선택) https://www.deepl.com/pro-api 무료 키 (월 50만자). 없으면 MyMemory 무료 번역으로 동작 |
   | `TRANSLATE_CONTACT_EMAIL` | (선택) MyMemory 무료 한도 5천→5만자/일 로 올리는 연락 이메일 |
   | `ALLOWED_ORIGIN` | `https://likha.co.kr` |
3. Deploy. 이후 GitHub push 때마다 자동 배포.
4. `assets/js/config.js` 의 `API_BASE` 는 `/api` 그대로 (같은 도메인). GitHub Pages를 계속 쓰려면 `https://<vercel앱>.vercel.app/api` 로.

## 4. 토스페이먼츠

- 개발자센터 https://developers.tosspayments.com → 내 개발정보 → **결제위젯 연동 키**
  - 클라이언트 키 → `config.js` `TOSS_CLIENT_KEY`
  - 시크릿 키 → Vercel `TOSS_SECRET_KEY`
- 테스트 키로 전체 흐름 확인 → 사업자 심사(통신판매업 신고 필요) → live 키 교체.
- 승인 흐름: 결제창 → `success.html` → `/api/confirm` 이 **DB 주문 금액과 대조** 후 토스 승인 → `orders.status = paid` → PM 알림.

## 5. 도메인

Vercel → Settings → Domains → `likha.co.kr` 추가 → 안내된 A/CNAME 레코드를 도메인 업체(가비아 등)에 입력. Supabase Site URL·Google origins도 같이 바꿀 것.

## 6. 운영 흐름 (실모드)

| 단계 | 누가 | 어디서 |
|---|---|---|
| 서비스 구매·결제 | 고객 | index.html (구글/카카오 로그인 → 토스) |
| 요구사항·원본 업로드 | 고객 | index.html → 내 주문 → 요구사항 제출 (Storage `sources`) |
| 영어 브리프 작성·작업 생성·배정 | PM | admin.html → 주문 → 새 작업 만들기 |
| 수락·편집·납품 | 크리에이터 | creator.html (12시간 내 수락, 체크리스트 후 링크 제출) |
| 검수·수정 요청·통과 | PM | admin.html → 작업 → 검수 |
| 고객 전달·구매 확정·리뷰 | PM → 고객 | admin.html "고객에게 납품" → 고객 "구매 확정" |
| 정산 | PM | admin.html → 정산 → 지급 생성 → GCash 송금 → 크리에이터 알림 |

## 7. 현재 상태 (2026-11-10 기준 라이브 테스트 완료)

실제 DB로 결제 → 요구사항 → 작업 생성 → 수락 → 납품 → 검수 → 고객 전달 → 구매 확정 → 정산 지급까지 전부 확인됨.

추가 마이그레이션 (신규 프로젝트는 schema.sql 다음에 순서대로 실행):
- `supabase/migrate_002_deliverables_notify.sql` — 주문 결과물(deliverables), 직원 알림 트리거, 견적 요청 테이블, 정산 플래그(paid_out), RLS 수정
- `supabase/migrate_003_cron.sql` — pg_cron: 제안 12시간 만료→오픈, 납품 7일 후 자동 구매확정, 15·30일 정산 알림

서버 함수: `api/confirm.js`(결제 승인) · `api/refund.js`(환불: 작업 전 전액 / 작업 중 부분) · `api/translate.js`(번역: DeepL → Google → **MyMemory 무료 폴백**, 키 없어도 동작)

파일: 고객 요구사항 파일 → Storage `sources` (PM 다운로드, 크리에이터에겐 7일 서명 링크) · 크리에이터 납품 → 링크 또는 Storage `deliverables` (50MB 이하; 고객에겐 30일 서명 링크)

### 아직 안 된 것
- 이메일/카카오 알림톡: 지금은 사이트 내 알림만. Resend(이메일) + 알림톡은 심사 필요.
- 토스 실결제: 개발자센터 「이용 신청하기」(사업자등록·통신판매업) 후 live 키로 교체.
- 푸터 사업자 정보([상호]/[000-00-00000]/[주소]) 실제 값으로.
- 도메인 likha.co.kr 연결 완료 (2026-11-10, 가비아 DNS A @ → 216.198.79.1, CNAME www → cname.vercel-dns.com). Supabase Site URL·Google origins 반영됨.
- 번역 품질: 볼륨 커지면 `DEEPL_API_KEY`(무료 월 50만자) 추가 권장.

## 보안 체크리스트

- [ ] `service_role`, `TOSS_SECRET_KEY`, `DEEPL_API_KEY` 는 Vercel 환경변수에만. Git·config.js에 없음 (.gitignore에 .env 포함)
- [ ] Supabase RLS 켜져 있음 (schema.sql이 켬). 테이블 추가 시 정책도 같이.
- [ ] 크리에이터 계정으로 로그인해서 `orders` 테이블이 안 보이는지 확인 (Supabase → Table editor → "Impersonate")
- [ ] 결제 승인은 `/api/confirm` 만. 프런트에서 `status = paid` 로 못 바꿈 (RLS: 고객은 paid/req/delivered 사이만 수정 가능)
