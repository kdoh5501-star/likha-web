# LIKHA 마켓 — 웹 초안

한국 PM이 검수하는 영상 편집 마켓(크몽형). 정적 사이트 + 토스페이먼츠 결제위젯 + 승인용 서버리스 함수 1개로 구성되어 있습니다.

## 화면 구성 (사이트맵)

| 경로 | 화면 | 내용 |
| --- | --- | --- |
| `#home` | 홈 | 검색, 카테고리 메가메뉴, 배너 3종, 카테고리 바로가기, 인기 서비스, 신뢰 요소, 주문 프로세스, 리뷰, CTA |
| `#category-{id}` / `#search` | 카테고리·검색 | 좌측 필터(카테고리·가격대·납기), 세부 카테고리 칩, 정렬, 카드 그리드. 모바일은 필터 시트 |
| `#service-{id}` | 서비스 상세 | 갤러리, 크리에이터 정보, 탭(설명·가격·포트폴리오·리뷰·크리에이터·환불/FAQ), 우측 고정 패키지 패널(STANDARD/DELUXE/PREMIUM + 추가 옵션 + 수량 + 총액), 모바일 하단 구매바 |
| `#creator-{id}` | 크리에이터 프로필 | 지표, 소개, 툴, 등록 서비스 |
| `#checkout` | 주문·결제 | 주문 서비스, 주문자 정보, **토스페이먼츠 결제위젯**(결제수단 + 약관), 우측 결제 금액(쿠폰·총액·결제 버튼) |
| `success.html` / `fail.html` | 결제 결과 | 토스 리다이렉트 페이지. success는 `api/confirm` 승인 호출 후 주문으로 이동 |
| `#orders` / `#order-{id}` | 주문 관리 | 진행 단계(결제→요구사항→작업→**PM 검수**→납품→확정), 요구사항 제출, 수정 요청, 구매 확정, 리뷰, 메시지 |
| `#request` | 맞춤 견적 | 숨고형 5단계 질문 → 제안 목록 → 수락 후 결제 |
| `#enterprise` | 기업·대행사 | 팀 단위 계약 안내, 진행 순서 |
| `#faq` | 자주 묻는 질문 | 8개 문답 |
| `#apply` | 크리에이터 등록 (EN) | 혜택 소개 + 지원 폼 |
| `#seller` | 크리에이터 센터 (EN) | 주문 현황 지표·테이블 (판매가 비노출) |
| `#terms` `#refund` `#privacy` | 약관 | 초안 (법률 검토 필요) |

판매 주체는 LIKHA(통신판매업)이며 크리에이터는 내부 작업자로 설계했습니다. 중개(에스크로) 구조는 3단계 플랫폼 전환 시 적용.

## 파일 구조

```
index.html            SPA 쉘 (헤더·푸터·탭바)
success.html          토스 결제 성공 리다이렉트 → 서버 승인 → 주문 생성
fail.html             토스 결제 실패 리다이렉트
assets/css/style.css  디자인 토큰·레이아웃 (라이트/다크)
assets/js/data.js     카테고리·크리에이터·서비스·패키지·옵션 예시 데이터
assets/js/images.js   서비스 썸네일·포트폴리오·배너 이미지 경로 (assets/img/*, AI 생성 예시)
assets/js/thumbs.js   이미지가 없을 때 쓰는 SVG 대체 썸네일
assets/js/payment.js  토스페이먼츠 결제위젯 v2 연동 (+ SDK 미로드 시 모의 위젯)
assets/js/app.js      라우터·화면·주문 흐름
api/confirm.js        결제 승인 서버리스 함수 (Vercel) — 시크릿 키 사용
```

## 로컬 실행

브라우저에서 `index.html`을 바로 열어도 되고, 간단한 서버를 띄워도 됩니다.

```bash
npx serve .        # http://localhost:3000
```

## 토스페이먼츠 연동

1. [개발자센터](https://developers.tosspayments.com) → API 키 → **결제위젯 연동 키**에서 클라이언트 키(`test_gck_…`)와 시크릿 키(`test_gsk_…`)를 확인
2. `assets/js/payment.js`의 `CLIENT_KEY`를 내 클라이언트 키로 교체 (지금은 토스 문서용 공개 테스트 키)
3. 시크릿 키는 **서버 환경변수** `TOSS_SECRET_KEY`에만 넣기 (`.env.example` 참고). 절대 프런트 코드·Git에 넣지 않기
4. 흐름: 결제하기 → `widgets.requestPayment()` → 토스 결제창 → `success.html?paymentKey&orderId&amount` → `POST api/confirm` → 주문 화면
5. 운영 전환 시 `live_gck_…` / `live_gsk_…`로 교체하고, 토스 상점관리자에서 계약·심사 완료 필요

테스트 결제는 실제 청구가 되지 않습니다. SDK를 불러올 수 없는 환경(미리보기 등)에서는 같은 구성의 모의 위젯이 표시됩니다.

## 배포

**A. Vercel (권장 — 결제 승인까지 동작)**
1. GitHub 저장소를 Vercel에 Import
2. Settings → Environment Variables에 `TOSS_SECRET_KEY` 추가
3. 배포 후 도메인 연결 (Settings → Domains)

**B. GitHub Pages (정적만)**
- Settings → Pages → Branch `main` / root 로 배포
- 결제창까지는 열리지만 `api/confirm`이 없어 승인은 "대기"로 표시됨. 승인 서버는 Vercel/Cloudflare Workers 등에 따로 두고 `success.html`의 fetch 경로를 그 주소로 바꾸면 됨

## 오픈 전 교체·채울 것

- 푸터 사업자 정보(상호, 사업자등록번호, 통신판매업 신고번호, 주소)
- `data.js`의 크리에이터·서비스·가격·리뷰(현재 예시) → 실제 데이터 또는 API
- `thumbs.js` 예시 이미지 → 크리에이터 실제 작업물
- 로그인(현재 데모) → 카카오/구글 OAuth
- 약관 3종 법률 검토
- 주문·메시지 저장(현재 브라우저 localStorage) → 서버 DB

## 쿠폰 테스트

결제 화면에서 `WELCOME10` 입력 시 10% 할인 적용(예시).
