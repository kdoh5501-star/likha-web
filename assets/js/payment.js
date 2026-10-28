/* LIKHA 결제 모듈 — 토스페이먼츠 결제위젯 v2
   - 실제 환경(GitHub Pages / Vercel 등): js.tosspayments.com SDK를 불러와 결제위젯을 렌더링하고, 결제하기 → 토스 결제창 → success.html 로 리다이렉트
   - SDK를 불러올 수 없는 환경(미리보기 등): 같은 레이아웃의 모의 위젯을 그리고 테스트 흐름으로 진행
   키 교체: 토스페이먼츠 개발자센터(developers.tosspayments.com) → API 키 → 결제위젯 연동 키 (test_gck_… / live_gck_…)
   시크릿 키는 절대 이 파일에 넣지 말 것 — api/confirm.js 서버 환경변수(TOSS_SECRET_KEY)로만 사용 */
window.LIKHA_PAY = (function () {
  const CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm"; // 토스 문서용 공개 테스트 키. 내 상점 키로 교체
  const SDK = "https://js.tosspayments.com/v2/standard";
  let widgets = null, mode = "none", mock = { method: "card", card: "", inst: "0", agreed: false };
  const $ = s => document.querySelector(s);

  function loadSdk() {
    return new Promise(resolve => {
      if (window.TossPayments) return resolve(true);
      const s = document.createElement("script"); s.src = SDK; s.async = true;
      const t = setTimeout(() => resolve(false), 4000);
      s.onload = () => { clearTimeout(t); resolve(!!window.TossPayments); };
      s.onerror = () => { clearTimeout(t); resolve(false); };
      document.head.appendChild(s);
    });
  }

  /* 결제 UI 렌더링. amount: 총 결제금액(원), customerKey: 로그인 사용자 키(비회원이면 ANONYMOUS) */
  async function render({ amount, customerKey, onReady }) {
    const ok = await loadSdk();
    if (ok) {
      try {
        const tp = window.TossPayments(CLIENT_KEY);
        widgets = tp.widgets({ customerKey: customerKey || window.TossPayments.ANONYMOUS });
        await widgets.setAmount({ currency: "KRW", value: amount });
        $("#payment-method").innerHTML = ""; $("#agreement").innerHTML = "";
        await Promise.all([
          widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
          widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" })
        ]);
        mode = "toss"; onReady && onReady("toss"); return;
      } catch (e) { console.warn("Toss widget failed, fallback to mock", e); }
    }
    mode = "mock"; renderMock(amount); onReady && onReady("mock");
  }

  async function setAmount(amount) {
    if (mode === "toss" && widgets) await widgets.setAmount({ currency: "KRW", value: amount });
    if (mode === "mock") { const el = $("#mockAmt"); if (el) el.textContent = amount.toLocaleString("ko-KR") + "원"; }
  }

  /* 결제 요청. 성공 시 토스가 successUrl 로 이동시키므로 이 함수는 돌아오지 않음(모의 모드는 Promise 로 결과 반환) */
  async function request({ orderId, orderName, amount, customerName, customerEmail, customerMobilePhone }) {
    const base = new URL("./", location.href).href;
    if (mode === "toss" && widgets) {
      await widgets.requestPayment({
        orderId, orderName, customerName, customerEmail, customerMobilePhone,
        successUrl: base + "success.html", failUrl: base + "fail.html"
      });
      return { redirected: true };
    }
    if (!mock.agreed) throw new Error("필수 약관에 동의해 주세요.");
    if (mock.method === "card" && !mock.card) throw new Error("카드사를 선택해 주세요.");
    await new Promise(r => setTimeout(r, 900));
    return { redirected: false, mock: true, paymentKey: "mock_" + Math.random().toString(36).slice(2, 12), orderId, amount, method: mock.method, approvedAt: new Date().toISOString() };
  }

  function agreed() { return mode === "mock" ? mock.agreed : true; }

  /* ---- 모의 위젯 (토스 결제위젯과 같은 구성: 결제수단 탭 → 카드사 선택 → 할부 / 약관) ---- */
  const CARDS = ["신한", "삼성", "현대", "KB국민", "롯데", "우리", "하나", "NH농협", "BC", "카카오뱅크", "토스뱅크", "씨티"];
  function renderMock(amount) {
    $("#payment-method").innerHTML = `
      <div class="toss-mock" id="tossMock">
        <div class="mh"><b>결제수단</b><span>결제금액 <b class="num" id="mockAmt">${amount.toLocaleString("ko-KR")}원</b></span></div>
        <div class="pm-grid" role="tablist">
          ${[["card", "신용·체크카드", ""], ["transfer", "계좌이체", ""], ["vbank", "가상계좌", "세금계산서"], ["phone", "휴대폰", ""]].map(([k, n, s]) => `<button type="button" role="tab" data-mm="${k}" class="${k === mock.method ? "on" : ""}">${n}${s ? `<small>${s}</small>` : ""}</button>`).join("")}
        </div>
        <div class="easy-row">
          <button type="button" data-mm="tosspay"><i style="background:#0064FF"></i>토스페이</button>
          <button type="button" data-mm="naverpay"><i style="background:#03C75A"></i>네이버페이</button>
          <button type="button" data-mm="kakaopay"><i style="background:#FEE500"></i>카카오페이</button>
        </div>
        <div id="mockDetail"></div>
      </div>`;
    $("#agreement").innerHTML = `
      <div class="agree-mock" id="agreeMock">
        <label class="check all"><input type="checkbox" id="agAll">전체 동의</label>
        <label class="check"><input type="checkbox" class="agReq">[필수] 전자금융거래 이용약관<a href="#terms">보기</a></label>
        <label class="check"><input type="checkbox" class="agReq">[필수] 개인정보 수집 및 이용 동의<a href="#privacy">보기</a></label>
        <label class="check"><input type="checkbox" class="agReq">[필수] 개인정보 제3자 제공 동의 (토스페이먼츠, 카드사)</label>
      </div>`;
    mockDetail();
    $("#tossMock").addEventListener("click", e => {
      const b = e.target.closest("[data-mm]"); if (b) { mock.method = b.dataset.mm; mock.card = "";
        $("#tossMock").querySelectorAll("[data-mm]").forEach(x => x.classList.toggle("on", x === b)); mockDetail(); }
      const c = e.target.closest("[data-mc]"); if (c) { mock.card = c.dataset.mc; $("#mockDetail").querySelectorAll("[data-mc]").forEach(x => x.classList.toggle("on", x === c)); }
    });
    $("#mockDetail").addEventListener("change", e => { if (e.target.id === "mockInst") mock.inst = e.target.value; });
    $("#agreeMock").addEventListener("change", e => {
      const all = [...document.querySelectorAll(".agReq")];
      if (e.target.id === "agAll") all.forEach(c => c.checked = e.target.checked);
      mock.agreed = all.every(c => c.checked); $("#agAll").checked = mock.agreed;
      document.dispatchEvent(new CustomEvent("likha:agree", { detail: mock.agreed }));
    });
  }
  function mockDetail() {
    const d = $("#mockDetail"); if (!d) return;
    const m = mock.method;
    if (m === "card") d.innerHTML = `<div class="card-grid-pm">${CARDS.map(c => `<button type="button" data-mc="${c}" class="${mock.card === c ? "on" : ""}">${c}</button>`).join("")}</div>
      <div class="inst" style="margin-top:10px"><span class="muted sm">할부</span><select id="mockInst" style="width:auto"><option value="0">일시불</option><option value="2">2개월</option><option value="3">3개월 (무이자)</option><option value="6">6개월</option></select></div>`;
    else if (m === "vbank") d.innerHTML = `<p class="sm muted">가상계좌가 발급되며 입금이 확인되면 주문이 시작됩니다. 사업자는 세금계산서를 신청할 수 있어요.</p>`;
    else if (m === "transfer") d.innerHTML = `<p class="sm muted">은행 앱으로 바로 이체합니다. 공동인증서 없이 간편 인증으로 진행돼요.</p>`;
    else if (m === "phone") d.innerHTML = `<p class="sm muted">통신사 소액결제. 월 한도 안에서 결제됩니다.</p>`;
    else d.innerHTML = `<p class="sm muted">간편결제 앱에서 결제를 승인하면 바로 완료됩니다.</p>`;
  }

  return { render, setAmount, request, agreed, get mode() { return mode; } };
})();
