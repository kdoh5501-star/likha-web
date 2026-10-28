/* LIKHA 마켓 SPA — 해시 라우팅 (#home, #category-shorts, #service-3, #checkout, #order-1001 …) */
(function () {
  "use strict";
  const D = window.LIKHA_DATA, T = window.LIKHA_THUMB, PAY = window.LIKHA_PAY;
  const { CATS, CR, SV, RV, STEPS, svc, cre, cat } = D;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const won = n => n.toLocaleString("ko-KR") + "원";
  const MATA = (window.LIKHA_MATA || {}).wave || "";
  const stLabel = k => (STEPS.find(x => x[0] === k) || [])[1] || k;

  /* ---------- state ---------- */
  const st = { user: null, q: "", cat: "all", sub: "", sort: "rec", fast: false, minP: "", maxP: "", pkg: {}, opts: {}, qty: {}, cart: null, orders: [], seq: 1001, wiz: { step: 0, a: {} }, props: null };
  try { const s = JSON.parse(localStorage.getItem("likha-state") || "null"); if (s) { st.user = s.user || null; st.orders = s.orders || []; st.seq = s.seq || 1001; } } catch (e) { }
  try { const o = JSON.parse(localStorage.getItem("likha-orders") || "null"); if (Array.isArray(o)) { o.forEach(x => { if (!st.orders.find(y => y.id === x.id)) st.orders.push(x); if (x.id >= st.seq) st.seq = x.id + 1; }); localStorage.removeItem("likha-orders"); } } catch (e) { }
  function save() { try { localStorage.setItem("likha-state", JSON.stringify({ user: st.user, orders: st.orders, seq: st.seq })); } catch (e) { } }
  function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600); }

  /* ---------- pieces ---------- */
  const minPrice = s => Math.min(...s.pk.map(p => p.price));
  const icon = (d, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const I = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', home: '<path d="M3 10.5 12 4l9 6.5V20H3z"/><path d="M10 20v-6h4v6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', bag: '<path d="M4 7h16l-1.2 13H5.2z"/><path d="M9 7a3 3 0 0 1 6 0"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>', won: '<path d="M4 7h16M4 11h16M6 5l3 14 3-10 3 10 3-14"/>', chat: '<path d="M4 5h16v11H8l-4 4z"/>', doc2: '<path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    chev: '<path d="m6 9 6 6 6-6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', check: '<path d="m5 12 5 5 9-10"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', filter: '<path d="M4 6h16M7 12h10M10 18h4"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>'
  };
  const stars = n => `<span class="star">${"★".repeat(Math.round(n))}</span>`;

  function card(s) {
    const c = cre(s.cr);
    return `<a class="scard" href="#service-${s.id}">
      <div class="thumb">${T.svg(s)}<span class="badge">${icon(I.shield, 12)} PM 검수</span></div>
      <div class="seller"><span class="mini-av" style="background:${c.color}">${c.init}</span>${esc(c.name)} <span class="tag" style="padding:1px 6px;font-size:11px">${c.level}</span></div>
      <div class="ttl">${esc(s.title)}</div>
      <div class="foot"><span class="rating">${stars(1)}<b>${s.rate}</b>(${s.rv})</span><span class="price num">${won(minPrice(s))}<small>~</small></span></div>
    </a>`;
  }
  const empty = (t, sub, btn) => `<div class="empty">${MATA ? `<img src="${MATA}" alt="">` : ""}<b>${t}</b><span>${sub}</span>${btn || ""}</div>`;

  /* ---------- views ---------- */
  function vHome() {
    const pop = [...SV].sort((a, b) => b.rv - a.rv).slice(0, 8);
    const shorts = SV.filter(s => s.cat === "shorts" || s.cat === "ai").slice(0, 4);
    const design = SV.filter(s => s.cat === "thumb" || s.cat === "motion").slice(0, 4);
    const slides = [
      { cls: "", eye: "LIKHA 영상 편집 마켓", h: "한국 PM이 검수하는<br>영상 편집, 더 저렴하게", p: "필리핀 코어 크리에이터가 편집하고 한국 PM이 납품 전에 한 번 더 확인합니다. 숏폼부터 롱폼, 썸네일까지 한 곳에서.", btn: ["서비스 둘러보기", "#category-shorts"], art: 1 },
      { cls: "t2", eye: "NEW · 숏폼 패키지", h: "릴스 10편, 같은 톤으로<br>한 번에 제작", p: "한 크리에이터가 전담해서 채널 톤이 흔들리지 않습니다. 쇼핑몰·병원·학원 채널에 맞춘 묶음 상품.", btn: ["패키지 보기", "#service-12"], art: 2 },
      { cls: "t3", eye: "맞춤 견적", h: "원하는 작업을 올리면<br>크리에이터가 제안합니다", p: "월 물량, 납기, 레퍼런스만 적어 주세요. 보통 2시간 안에 가격과 일정 제안이 도착합니다.", btn: ["맞춤 견적 요청", "#request"], art: 3 }
    ];
    return `<div class="wrap">
      <section class="hero" id="hero" aria-roledescription="carousel">
        ${slides.map((s, i) => `<div class="slide ${i === 0 ? "on" : ""}" data-cls="${s.cls}"><div><span class="eyebrow">${s.eye}</span><h1>${s.h}</h1><p>${s.p}</p><a class="btn btn-lg" style="background:#fff;color:#111827" href="${s.btn[1]}">${s.btn[0]}</a></div><div class="art">${T.heroArt(s.art)}</div></div>`).join("")}
        <div class="dots">${slides.map((_, i) => `<button type="button" data-dot="${i}" class="${i === 0 ? "on" : ""}" aria-label="${i + 1}번 배너"></button>`).join("")}</div>
      </section>
      <nav class="quick" aria-label="카테고리">${CATS.map(c => `<a href="#category-${c.id}"><span class="ic">${icon(c.ic, 24)}</span><b>${c.name}</b></a>`).join("")}</nav>
      <section class="sec"><div class="sec-h"><div><h2>지금 가장 많이 찾는 서비스</h2><p>리뷰가 많은 순</p></div><a href="#category-all">전체 보기 →</a></div><div class="card-grid">${pop.map(card).join("")}</div></section>
      <section class="sec" style="padding-top:8px"><div class="trust">
        <div><span class="ic">${icon(I.shield, 20)}</span><div><b>한국 PM 전수 검수</b><span>자막 오탈자, 음량, 비율, 요청 반영을 납품 전에 확인</span></div></div>
        <div><span class="ic">${icon(I.won, 20)}</span><div><b>국내 외주보다 저렴</b><span>필리핀 코어팀이 작업해 같은 품질을 더 낮은 비용으로</span></div></div>
        <div><span class="ic">${icon(I.chat, 20)}</span><div><b>한국어로 요청</b><span>한국어로 쓰면 PM이 크리에이터에게 전달</span></div></div>
        <div><span class="ic">${icon(I.lock, 20)}</span><div><b>안전 결제·세금계산서</b><span>토스페이먼츠 결제, 구매 확정 전까지 환불 보장</span></div></div>
      </div></section>
      <section class="sec"><div class="sec-h"><div><h2>숏폼 · AI 영상</h2><p>매일 올리는 채널을 위한 서비스</p></div><a href="#category-shorts">더 보기 →</a></div><div class="card-grid">${shorts.map(card).join("")}</div></section>
      <section class="sec"><div class="sec-h"><div><h2>썸네일 · 모션그래픽</h2><p>클릭률과 완성도를 올리는 디자인</p></div><a href="#category-thumb">더 보기 →</a></div><div class="card-grid">${design.map(card).join("")}</div></section>
      <section class="sec"><div class="sec-h"><div><h2>주문부터 납품까지</h2><p>모든 주문은 PM 검수를 거칩니다</p></div></div>
        <div class="process">${STEPS.map(([k, l], i) => `<div class="${k === "review" ? "hl" : ""}"><span class="n">0${i + 1}</span><b>${l}</b><span>${["토스페이먼츠 안전결제", "원본과 요청사항 업로드", "크리에이터가 편집", "한국 PM이 체크리스트로 확인", "결과물 확인, 수정 요청", "확정 후 리뷰 작성"][i]}</span></div>`).join("")}</div></section>
      <section class="sec"><div class="sec-h"><div><h2>고객 리뷰</h2><p>예시 리뷰입니다</p></div></div><div class="rvstrip">${RV.slice(0, 3).map(r => `<div>${stars(r[2])}<p>${esc(r[1])}</p><span class="who">${r[0]} · ${["숏폼 편집", "유튜브 롱폼", "썸네일 디자인"][RV.indexOf(r)]}</span></div>`).join("")}</div></section>
      <section class="sec" style="padding-bottom:56px"><div class="cta2">
        <a href="#request"><div><b>원하는 서비스가 없나요?</b><span>맞춤 견적을 요청하면 크리에이터가 제안합니다</span></div><span class="arr">${icon(I.arrow, 18)}</span></a>
        <a href="#apply"><div><b>Are you a video editor?</b><span>Join LIKHA and work with Korean brands</span></div><span class="arr">${icon(I.arrow, 18)}</span></a>
      </div></section>
    </div>`;
  }

  function filtered() {
    let list = SV.filter(s => st.cat === "all" || s.cat === st.cat);
    if (st.q) { const q = st.q.toLowerCase(); list = list.filter(s => (s.title + s.desc + (cat(s.cat) || {}).name + cre(s.cr).name).toLowerCase().includes(q)); }
    if (st.fast) list = list.filter(s => Math.min(...s.pk.map(p => p.days)) <= 2);
    if (st.minP) list = list.filter(s => minPrice(s) >= +st.minP);
    if (st.maxP) list = list.filter(s => minPrice(s) <= +st.maxP);
    const sorts = { rec: (a, b) => b.rate * b.rv - a.rate * a.rv, rate: (a, b) => b.rate - a.rate, rv: (a, b) => b.rv - a.rv, low: (a, b) => minPrice(a) - minPrice(b), high: (a, b) => minPrice(b) - minPrice(a) };
    return list.sort(sorts[st.sort]);
  }
  function vCategory() {
    const list = filtered(), c = cat(st.cat);
    const title = st.q ? `'${esc(st.q)}' 검색 결과` : c ? c.name : "전체 서비스";
    return `<div class="wrap"><div class="cat-layout">
      <aside class="filters" id="filters">
        <div><h3>카테고리</h3><label class="opt ${st.cat === "all" ? "on" : ""}"><input type="radio" name="fc" value="all" ${st.cat === "all" ? "checked" : ""}>전체</label>${CATS.map(x => `<label class="opt ${st.cat === x.id ? "on" : ""}"><input type="radio" name="fc" value="${x.id}" ${st.cat === x.id ? "checked" : ""}>${x.name}</label>`).join("")}</div>
        <div><h3>가격대</h3><div class="price-in"><input type="number" id="fMin" placeholder="최소" value="${st.minP}" inputmode="numeric"><span class="muted">~</span><input type="number" id="fMax" placeholder="최대" value="${st.maxP}" inputmode="numeric"></div><button class="btn btn-line btn-sm btn-block" id="fApply" style="margin-top:8px">적용</button></div>
        <div><h3>납기</h3><label class="opt ${st.fast ? "on" : ""}"><input type="checkbox" id="fFast" ${st.fast ? "checked" : ""}>2일 이내 납품</label></div>
        <button class="btn btn-dark btn-block m-only" id="fClose" style="display:none">결과 보기</button>
      </aside>
      <section>
        <div class="res-h"><h1>${title}<span class="num">${list.length}개</span></h1><div style="display:flex;gap:8px;align-items:center"><button class="btn btn-line btn-sm m-filter" id="fOpen">${icon(I.filter, 16)} 필터</button><select id="fSort" aria-label="정렬"><option value="rec">추천순</option><option value="rate">평점 높은순</option><option value="rv">리뷰 많은순</option><option value="low">낮은 가격순</option><option value="high">높은 가격순</option></select></div></div>
        ${c ? `<div class="subcats"><button class="chip ${!st.sub ? "on" : ""}" data-sub="">전체</button>${c.subs.map(x => `<button class="chip ${st.sub === x ? "on" : ""}" data-sub="${esc(x)}">${esc(x)}</button>`).join("")}</div>` : ""}
        ${list.length ? `<div class="card-grid">${list.map(card).join("")}</div>` : empty("조건에 맞는 서비스가 없어요", "검색어나 필터를 바꾸거나 맞춤 견적을 요청해 보세요.", '<a class="btn btn-accent" href="#request">맞춤 견적 요청</a>')}
        ${st.q ? `<p class="sm" style="margin-top:20px"><button class="link" id="clearQ">검색어 지우기</button></p>` : ""}
      </section>
    </div></div>`;
  }

  function pkgBox(s) {
    const pi = st.pkg[s.id] ?? 1, p = s.pk[pi], picked = st.opts[s.id] || {}, qty = st.qty[s.id] || 1;
    const optSum = s.opts.filter(o => picked[o.id]).reduce((a, o) => a + o.price, 0);
    const total = (p.price + optSum) * qty;
    return `<div class="pkg" id="pkgBox">
      <div class="pkg-tabs" role="tablist">${s.pk.map((x, i) => `<button type="button" role="tab" aria-selected="${i === pi}" class="${i === pi ? "on" : ""}" data-pk="${i}">${x.n}</button>`).join("")}</div>
      <div class="pkg-body">
        <div class="pp"><b class="num">${won(p.price)}</b><small>VAT 포함</small></div>
        <div class="pd">${esc(p.desc)}</div>
        <ul class="inc">${p.inc.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <div class="facts"><div>작업일<b class="num">${p.days}일</b></div><div>수정 횟수<b class="num">${p.rev}회</b></div></div>
        ${s.opts.length ? `<div><div class="lbl" style="margin-bottom:8px">추가 옵션</div><div class="opts">${s.opts.map(o => `<label class="optbox"><input type="checkbox" data-opt="${o.id}" ${picked[o.id] ? "checked" : ""}><span class="i"></span><span class="t"><b>${esc(o.n)}</b>${o.desc ? `<span>${esc(o.desc)}</span>` : ""}</span><span class="p num">+${won(o.price)}</span></label>`).join("")}</div></div>` : ""}
        <div class="qty"><span class="lbl">수량</span><span class="qtyctl"><button type="button" data-q="-1" aria-label="수량 줄이기">−</button><span class="num">${qty}</span><button type="button" data-q="1" aria-label="수량 늘리기">+</button></span></div>
        <div class="total"><span>총 결제금액</span><b class="num" id="pkgTotal">${won(total)}</b></div>
        <button class="btn btn-accent btn-lg btn-block" data-buy="${s.id}">구매하기</button>
        <button class="btn btn-line btn-block" data-ask="${s.id}">문의하기</button>
        <div class="pmnote">${icon(I.shield, 16)}<span>납품 전 한국 PM이 체크리스트로 검수하고, 구매 확정 전까지 환불이 가능합니다.</span></div>
      </div></div>`;
  }
  function vService(id) {
    const s = svc(id); if (!s) return vNotFound();
    const c = cre(s.cr), pi = st.pkg[s.id] ?? 1, p = s.pk[pi];
    const rvs = RV.map((r, i) => ({ who: r[0], t: r[1], sc: r[2], d: `2026.10.${String(26 - i * 3).padStart(2, "0")}`, pk: s.pk[i % 3].n }));
    const more = SV.filter(x => x.cat === s.cat && x.id !== s.id).slice(0, 4);
    const imgs = [T.svg(s, "wide", 0), T.svg(s, "wide", 1), T.svg(s, "wide", 2)];
    return `<div class="wrap"><div class="detail">
      <div style="min-width:0">
        <div class="crumb"><a href="#home">홈</a>${icon(I.chev, 12)}<a href="#category-${s.cat}">${cat(s.cat).name}</a>${icon(I.chev, 12)}<span>${esc(cat(s.cat).subs[0])}</span></div>
        <h1>${esc(s.title)}</h1>
        <div class="sellerline"><a class="who" href="#creator-${c.id}"><span class="mini-av" style="background:${c.color};width:26px;height:26px;font-size:11px">${c.init}</span>${esc(c.name)}<span class="tag">${c.level}</span></a><span class="dot"></span><span class="rating">${stars(1)}<b>${s.rate}</b>&nbsp;(${s.rv})</span><span class="dot"></span><span class="muted">응답 ${c.resp}</span><span class="dot"></span><span class="muted">완료 ${c.done}건</span></div>
        <div class="gallery"><div class="main" id="gMain">${imgs[0]}</div><div class="thumbs">${imgs.map((g, i) => `<button type="button" data-g="${i}" class="${i === 0 ? "on" : ""}" aria-label="이미지 ${i + 1}">${g}</button>`).join("")}</div></div>
        <div id="mPkg"></div>
        <nav class="dtabs"><a href="#service-${s.id}" data-jump="d-desc" class="on">서비스 설명</a><a href="#service-${s.id}" data-jump="d-price">가격 정보</a><a href="#service-${s.id}" data-jump="d-pf">포트폴리오</a><a href="#service-${s.id}" data-jump="d-rv">리뷰 ${s.rv}</a><a href="#service-${s.id}" data-jump="d-exp">크리에이터</a><a href="#service-${s.id}" data-jump="d-faq">환불·FAQ</a></nav>
        <section class="dsec" id="d-desc"><h2>서비스 설명</h2><p>${esc(s.desc)}</p>
          <ul class="bul"><li>원본과 결과물은 LIKHA 클라우드로만 주고받습니다. 크리에이터 개인 기기에 저장하지 않습니다.</li><li>납품 전 한국 PM이 체크리스트(요청 반영, 자막, 음량, 비율, 저작권 소재)로 검수합니다.</li><li>수정은 패키지에 적힌 횟수만큼 포함되며, 추가 수정은 옵션으로 구매할 수 있습니다.</li></ul></section>
        <section class="dsec" id="d-price"><h2>가격 정보</h2><div class="pricetbl"><table><thead><tr><th></th>${s.pk.map(x => `<th>${x.n}</th>`).join("")}</tr></thead><tbody>
          <tr><td>가격</td>${s.pk.map(x => `<td class="pn num">${won(x.price)}</td>`).join("")}</tr>
          <tr><td>패키지 설명</td>${s.pk.map(x => `<td>${esc(x.desc)}</td>`).join("")}</tr>
          <tr><td>작업 기간</td>${s.pk.map(x => `<td class="num">${x.days}일</td>`).join("")}</tr>
          <tr><td>수정 횟수</td>${s.pk.map(x => `<td class="num">${x.rev}회</td>`).join("")}</tr>
          <tr><td>포함 사항</td>${s.pk.map(x => `<td>${x.inc.map(esc).join("<br>")}</td>`).join("")}</tr>
        </tbody></table></div>
        ${s.opts.length ? `<h3 style="font-size:15px;margin:18px 0 8px">추가 옵션</h3><div class="pricetbl"><table><tbody>${s.opts.map(o => `<tr><td>${esc(o.n)}</td><td>${esc(o.desc || "")}</td><td class="num" style="text-align:right;font-weight:700">+${won(o.price)}</td></tr>`).join("")}</tbody></table></div>` : ""}</section>
        <section class="dsec" id="d-pf"><h2>포트폴리오</h2><div class="pf-grid">${[0, 1, 2].map(i => `<div>${T.svg(s, "tall", i)}</div>`).join("")}</div><p class="xs muted" style="margin-top:8px">포트폴리오 이미지는 예시입니다. 실제 서비스에서는 크리에이터의 작업물이 표시됩니다.</p></section>
        <section class="dsec" id="d-rv"><h2>리뷰</h2>
          <div class="rv-sum"><div><div class="big num">${s.rate}</div><div class="star" style="font-size:16px">★★★★★</div><div class="xs muted">리뷰 ${s.rv}개</div></div><div class="bars">${[5, 4, 3, 2, 1].map(n => `<div class="bar"><span style="width:14px">${n}점</span><i><b style="width:${[82, 14, 3, 1, 0][5 - n]}%"></b></i><span class="num" style="width:30px;text-align:right">${[82, 14, 3, 1, 0][5 - n]}%</span></div>`).join("")}</div></div>
          ${rvs.map(r => `<div class="rv"><div class="h"><span>${stars(r.sc)} <b>${r.who}</b> · ${r.pk}</span><span class="num">${r.d}</span></div><p>${esc(r.t)}</p></div>`).join("")}</section>
        <section class="dsec" id="d-exp"><h2>크리에이터</h2><a class="expert" href="#creator-${c.id}"><span class="big-av" style="background:${c.color}">${c.init}</span><div style="min-width:0;flex:1"><b style="font-size:16px">${esc(c.name)}</b> <span class="tag">${c.level}</span><div class="sm muted" style="margin-top:2px">${c.role} · 경력 ${c.years}년 · LIKHA 아카데미 수료</div><div class="stats"><span>완료 ${c.done}건</span><span>평점 ${c.rate}</span><span>응답 ${c.resp}</span></div></div>${icon(I.chev, 18)}</a></section>
        <section class="dsec faq" id="d-faq"><h2>취소·환불 규정 및 FAQ</h2>
          <details open><summary>작업 시작 전 취소</summary><p>요구사항 제출 전에는 전액 환불됩니다. 결제 수단으로 즉시 취소 처리됩니다.</p></details>
          <details><summary>작업 시작 후 취소</summary><p>진행 정도에 따라 남은 분량만큼 환불됩니다. 납품 후에는 수정 요청으로 해결하며, 구매 확정 후에는 환불되지 않습니다. 회사 귀책으로 납기를 지키지 못하면 전액 환불합니다.</p></details>
          <details><summary>결과물 저작권은 누구에게 있나요?</summary><p>구매 확정 시점에 크리에이터 → LIKHA → 고객 순으로 저작재산권이 양도됩니다.</p></details>
          <details><summary>세금계산서를 받을 수 있나요?</summary><p>결제 시 가상계좌를 선택하거나, 결제 후 주문 상세에서 사업자 정보를 등록하면 발행됩니다.</p></details>
        </section>
        ${more.length ? `<section class="dsec"><h2>비슷한 서비스</h2><div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${more.map(card).join("")}</div></section>` : ""}
      </div>
      <aside id="dPkg">${pkgBox(s)}</aside>
    </div></div>
    <div class="buybar"><div class="bp"><span>${p.n}</span><b class="num" id="barTotal">${won(p.price)}</b></div><button class="btn btn-accent" data-buy="${s.id}">구매하기</button></div>`;
  }

  function vCreator(id) {
    const c = cre(id); if (!c) return vNotFound();
    const list = SV.filter(s => s.cr === c.id);
    return `<div class="wrap">
      <div class="cp-head"><span class="big-av" style="background:${c.color}">${c.init}</span><div style="flex:1;min-width:0"><h1>${esc(c.name)} <span class="tag">${c.level}</span></h1><div class="muted" style="margin-top:4px">${c.role} · 경력 ${c.years}년 · 필리핀 · LIKHA 코어팀</div><div class="tags" style="margin-top:10px">${c.tools.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div></div><button class="btn btn-line" data-ask="${list[0] ? list[0].id : ""}">문의하기</button></div>
      <div class="kpis" style="margin-top:14px"><div class="kpi"><b class="num">${c.done}</b><span>완료한 작업</span></div><div class="kpi"><b class="num">${c.rate}</b><span>평점 (${c.rv})</span></div><div class="kpi"><b>${c.resp}</b><span>평균 응답</span></div><div class="kpi"><b class="num">98%</b><span>납기 준수</span></div></div>
      <div class="panel" style="margin-top:14px"><h3>소개</h3><p style="color:var(--fg-2)">${esc(c.bio)}</p></div>
      <section class="sec"><div class="sec-h"><h2>${esc(c.name.split(" ")[0])}님의 서비스</h2></div><div class="card-grid">${list.map(card).join("")}</div></section>
    </div>`;
  }

  /* ---------- checkout ---------- */
  function cartCalc(ck) {
    const s = svc(ck.sid), p = s.pk[ck.pi];
    const opts = s.opts.filter(o => ck.opts[o.id]);
    const optSum = opts.reduce((a, o) => a + o.price, 0);
    const sub = (p.price + optSum) * ck.qty;
    const disc = ck.coupon === "WELCOME10" ? Math.round(sub * 0.1) : 0;
    return { s, p, opts, optSum, sub, disc, total: sub - disc };
  }
  function vCheckout() {
    const ck = st.cart; if (!ck) return `<div class="wrap">${empty("결제할 서비스가 없어요", "서비스를 고른 뒤 구매하기를 눌러 주세요.", '<a class="btn btn-accent" href="#category-all">서비스 둘러보기</a>')}</div>`;
    const { s, p, opts, sub, disc, total } = cartCalc(ck);
    const u = st.user || {};
    return `<div class="wrap"><div class="co">
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div><h1>주문 · 결제</h1><div class="steps-top"><b>1 주문 확인</b>${icon(I.chev, 12)}<b>2 결제</b>${icon(I.chev, 12)}<span>3 요구사항 제출</span></div></div>
        <div class="panel"><h2>주문 서비스</h2><div class="oitem"><div class="t">${T.svg(s)}</div><div class="b"><b>${esc(s.title)}</b><span class="sm">${p.n} · ${esc(p.desc)} · 작업 ${p.days}일 · 수정 ${p.rev}회</span>${opts.length ? `<span class="sm">옵션: ${opts.map(o => esc(o.n)).join(", ")}</span>` : ""}<span class="sm">수량 ${ck.qty}</span></div></div></div>
        <div class="panel"><h2>주문자 정보</h2><div class="two">
          <div class="field"><label for="o-name">이름</label><input type="text" id="o-name" value="${esc(u.name || "")}" placeholder="홍길동" autocomplete="name"></div>
          <div class="field"><label for="o-phone">휴대폰</label><input type="tel" id="o-phone" value="${esc(u.phone || "")}" placeholder="010-0000-0000" autocomplete="tel"></div>
          <div class="field"><label for="o-email">이메일</label><input type="email" id="o-email" value="${esc(u.email || "")}" placeholder="name@company.com" autocomplete="email"></div>
          <div class="field"><label for="o-biz">사업자등록번호 <span class="muted" style="font-weight:400">(세금계산서, 선택)</span></label><input type="text" id="o-biz" placeholder="000-00-00000"></div>
        </div><p class="err" id="o-err" hidden>이름, 휴대폰, 이메일을 입력해 주세요.</p></div>
        <div class="panel"><h2>결제 수단</h2><div class="paybox"><div id="payment-method"><div class="sm muted" style="padding:12px 0">결제 수단을 불러오는 중…</div></div><div id="agreement"></div></div>
          <p class="xs muted" id="payModeNote"></p></div>
      </div>
      <aside class="panel sum"><h2>결제 금액</h2>
        <div class="rows">
          <div class="row"><span>${p.n} 패키지 × ${ck.qty}</span><span class="num">${won(p.price * ck.qty)}</span></div>
          ${opts.map(o => `<div class="row"><span>옵션 · ${esc(o.n)} × ${ck.qty}</span><span class="num">+${won(o.price * ck.qty)}</span></div>`).join("")}
          <div class="row"><span>쿠폰 할인</span><span class="num" id="discRow">${disc ? "−" + won(disc) : "0원"}</span></div>
          <div class="coupon"><input type="text" id="coupon" placeholder="쿠폰 코드 (예: WELCOME10)" value="${esc(ck.coupon || "")}"><button class="btn btn-line" id="couponBtn" type="button">적용</button></div>
          <div class="row tot"><span>총 결제금액<br><span class="sub">VAT 포함</span></span><b class="num" id="totRow">${won(total)}</b></div>
        </div>
        <button class="btn btn-accent btn-lg btn-block" id="payBtn" disabled><span id="payLbl">${won(total)} 결제하기</span></button>
        <div class="secure">${icon(I.lock, 14)} 토스페이먼츠 안전결제 · 카드 정보는 LIKHA에 저장되지 않습니다</div>
        <p class="xs muted">결제 후 요구사항을 제출하면 작업이 시작됩니다. 요구사항 제출 전에는 전액 환불됩니다.</p>
      </aside>
    </div></div>`;
  }
  async function mountCheckout() {
    const ck = st.cart; if (!ck) return;
    const { total } = cartCalc(ck);
    await PAY.render({ amount: total, customerKey: st.user ? st.user.key : undefined, onReady: m => {
      $("#payModeNote").textContent = m === "toss" ? "토스페이먼츠 테스트 결제위젯이 연결되어 있습니다. 실제 결제는 일어나지 않습니다." : "미리보기 환경에서는 결제위젯 대신 같은 구성의 테스트 화면이 표시됩니다. 배포 후에는 토스페이먼츠 결제창이 열립니다.";
      updatePayBtn(); } });
  }
  function updatePayBtn() { const b = $("#payBtn"); if (!b || !st.cart) return; b.disabled = !PAY.agreed(); }

  /* ---------- orders ---------- */
  function vOrders() {
    if (!st.user) return `<div class="wrap">${empty("로그인이 필요해요", "주문 내역은 로그인 후 볼 수 있어요.", '<button class="btn btn-accent" data-login>로그인</button>')}</div>`;
    if (!st.orders.length) return `<div class="wrap">${empty("아직 주문이 없어요", "마음에 드는 서비스를 골라 첫 주문을 해 보세요.", '<a class="btn btn-accent" href="#category-all">서비스 둘러보기</a>')}</div>`;
    return `<div class="wrap sec"><div class="sec-h"><h2>내 주문</h2></div><div class="olist">${[...st.orders].reverse().map(o => { const s = svc(o.sid); return `<a class="oli" href="#order-${o.id}"><div class="t">${T.svg(s)}</div><div class="b"><span><span class="status s-${o.status}">${stLabel(o.status)}</span></span><b>${esc(s.title)}</b><span class="sm muted num">주문번호 ${o.orderId || o.id} · ${s.pk[o.pi].n} · ${won(o.amount)} · ${o.date}</span></div>${icon(I.chev, 18)}</a>`; }).join("")}</div></div>`;
  }
  function vOrder(id) {
    const o = st.orders.find(x => x.id === +id); if (!o) return vNotFound();
    const s = svc(o.sid), p = s.pk[o.pi], c = cre(s.cr), idx = STEPS.findIndex(x => x[0] === o.status), left = p.rev - o.revs;
    let action = "";
    if (o.status === "paid") action = `<div class="panel"><h2>요구사항 제출</h2><div class="notice info">${icon(I.doc, 18)}<span>결제가 완료됐어요. 원본과 요청사항을 제출하면 크리에이터가 바로 작업을 시작합니다.</span></div>
      <div class="field"><label for="rq-text">요청사항</label><textarea id="rq-text" placeholder="예: 첫 3초에 제품 클로즈업, 자막은 노란 박스 스타일, BGM은 밝게. 참고 영상 링크도 적어 주세요."></textarea></div>
      <label class="filelbl"><input type="file" id="rq-file" multiple><b>원본 · 레퍼런스 파일 업로드</b><span>영상, 이미지, 문서 · 대용량은 클라우드 링크로</span></label><ul class="flist" id="rq-list"></ul>
      <p class="err" id="rq-err" hidden>요청사항을 적어 주세요.</p><button class="btn btn-accent btn-lg" id="rqSend">요구사항 제출하기</button></div>`;
    else if (o.status === "work") action = `<div class="panel"><h2>크리에이터가 작업 중이에요</h2><p style="color:var(--fg-2)">${esc(c.name)}님이 편집하고 있어요. 예상 납품일은 <b>${o.due}</b>입니다.${o.revs ? ` (수정 ${o.revs}회차 반영 중)` : ""}</p><button class="btn btn-line" data-adv="${o.id}">데모: 다음 단계로</button></div>`;
    else if (o.status === "review") action = `<div class="panel"><h2>한국 PM이 검수 중이에요</h2><ul class="cklist"><li class="y"><i>✓</i>요청사항 반영</li><li class="y"><i>✓</i>자막 오탈자·맞춤법</li><li class="n"><i></i>음량·BGM 밸런스</li><li class="n"><i></i>화면 비율·해상도</li><li class="n"><i></i>원본 노출·저작권 소재</li></ul><button class="btn btn-line" data-adv="${o.id}">데모: 검수 완료</button></div>`;
    else if (o.status === "delivered") action = `<div class="panel"><h2>결과물이 도착했어요</h2>
      <div class="file"><span class="fi">MP4</span><div style="min-width:0"><b>${esc(s.title.slice(0, 16))}_최종본_v${o.revs + 1}.mp4</b><div class="sm muted">PM 검수 완료 · 예시 파일</div></div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-accent" id="confirmBtn">구매 확정</button><button class="btn btn-line" id="revBtn" ${left <= 0 ? "disabled" : ""}>수정 요청 (남은 ${Math.max(0, left)}회)</button></div>
      <div id="revForm" hidden class="field"><label for="rv-text">수정할 내용</label><textarea id="rv-text" placeholder="예: 0:12 자막 색을 흰색으로, 마지막 컷 2초 줄이기"></textarea><button class="btn btn-brand" id="revSend" style="align-self:flex-start">수정 요청 보내기</button></div>
      <p class="xs muted">납품 후 7일 안에 확정하지 않으면 자동으로 구매 확정됩니다.</p></div>`;
    else action = o.review ? `<div class="notice ok">${icon(I.check, 18)}<span><b>구매 확정 · 리뷰 완료</b><br>${stars(o.review.sc)} ${esc(o.review.t)}</span></div>`
      : `<div class="panel"><h2>리뷰 작성</h2><p class="sm muted">리뷰는 다른 고객이 크리에이터를 고를 때 큰 도움이 돼요.</p><div class="stars" id="stars" data-v="5">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}" class="on" aria-label="${n}점">★</button>`).join("")}</div><textarea id="rvw" placeholder="작업은 어땠나요?"></textarea><button class="btn btn-accent" id="rvwSend" style="align-self:flex-start">리뷰 등록</button></div>`;
    return `<div class="wrap"><div class="ord">
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div><a class="sm muted" href="#orders">← 내 주문</a><h1 style="font-size:22px;font-weight:800;margin-top:6px">주문번호 <span class="num">${o.orderId || o.id}</span></h1><div class="sm muted num">${o.date} 결제 · ${o.method === "mock" ? "테스트 결제" : "토스페이먼츠"}</div></div>
        <div class="panel"><div class="progress">${STEPS.map(([k, l], i) => `<div class="${i < idx ? "done" : i === idx ? "cur" : ""}"><i></i>${l}</div>`).join("")}</div></div>
        ${action}
        <div class="panel"><h2>주문 정보</h2><div class="oitem"><div class="t">${T.svg(s)}</div><div class="b"><b>${esc(s.title)}</b><span class="sm">${p.n} · ${esc(p.desc)}${o.optNames && o.optNames.length ? " · 옵션: " + o.optNames.map(esc).join(", ") : ""}</span><span class="sm num">결제금액 ${won(o.amount)}</span></div></div>${o.req ? `<hr class="hr"><div class="sm"><b>요청사항</b><p class="muted" style="margin-top:4px">${esc(o.req)}</p></div>` : ""}</div>
      </div>
      <aside class="panel"><h2>메시지</h2><p class="sm muted">크리에이터와 PM이 함께 보는 대화방입니다. 한국어로 쓰셔도 돼요.</p>
        <div class="msgs" id="msgs">${o.msgs.map(m => `<div class="msg ${m.me ? "me" : ""}">${esc(m.t)}<small>${m.me ? "나" : esc(m.w)}</small></div>`).join("")}</div>
        <form class="msg-in" id="msgForm"><input type="text" id="msgIn" placeholder="메시지 입력" aria-label="메시지"><button class="btn btn-brand" type="submit">전송</button></form>
      </aside>
    </div></div>`;
  }

  /* ---------- request wizard (숨고식) ---------- */
  const WIZ = [
    { q: "어떤 작업이 필요하세요?", key: "cat", type: "pick", opts: CATS.map(c => [c.id, c.name, c.sub]) },
    { q: "분량은 어느 정도인가요?", key: "vol", type: "pick", opts: [["one", "1회성 작업", "한 번만 맡겨볼게요"], ["m10", "월 10~30편", "매달 꾸준히"], ["m30", "월 30~100편", "채널 여러 개"], ["m100", "월 100편 이상", "대행사·프로덕션"]] },
    { q: "원하는 납기는요?", key: "due", type: "pick", opts: [["d3", "3일 이내", "급해요"], ["w1", "1주 이내", ""], ["w2", "2주 이내", ""], ["flex", "협의 가능", "품질이 우선"]] },
    { q: "예산은 어느 정도로 생각하세요?", key: "budget", type: "pick", opts: [["b1", "30만 원 이하", ""], ["b2", "30~100만 원", ""], ["b3", "100~300만 원", ""], ["b4", "300만 원 이상", ""], ["b0", "잘 모르겠어요", "제안을 받아볼게요"]] },
    { q: "작업을 설명해 주세요", key: "desc", type: "text" }
  ];
  function vRequest() {
    const w = st.wiz, step = w.step, total = WIZ.length;
    if (st.props) return vProposals();
    const cur = WIZ[step];
    let body = "";
    if (cur.type === "pick") body = `<div class="pickgrid">${cur.opts.map(([v, n, s]) => `<label><input type="radio" name="wz" value="${v}" ${w.a[cur.key] === v ? "checked" : ""}><b>${n}</b>${s ? `<span>${s}</span>` : ""}</label>`).join("")}</div>`;
    else body = `<div class="field"><label for="wz-title">요청 제목</label><input type="text" id="wz-title" value="${esc(w.a.title || "")}" placeholder="예: 피부과 채널 쇼츠 월 20편"></div>
      <div class="field"><label for="wz-desc">상세 내용</label><textarea id="wz-desc" placeholder="채널 링크, 참고 영상, 원하는 스타일, 원본 분량을 적어 주세요">${esc(w.a.desc || "")}</textarea></div>
      <div class="two"><div class="field"><label for="wz-name">이름</label><input type="text" id="wz-name" value="${esc(w.a.name || (st.user ? st.user.name : "") || "")}"></div><div class="field"><label for="wz-phone">연락처</label><input type="tel" id="wz-phone" value="${esc(w.a.phone || "")}" placeholder="010-0000-0000"></div></div>
      <p class="err" id="wz-err" hidden>제목, 상세 내용, 연락처를 입력해 주세요.</p>`;
    return `<div class="wrap"><div class="wiz">
      <div><h1>맞춤 견적 요청</h1><p class="muted" style="margin-top:6px">5개 질문에 답하면 크리에이터가 가격과 일정을 제안합니다. 보통 2시간 안에 도착해요.</p></div>
      <div class="bar"><i style="width:${((step + 1) / total) * 100}%"></i></div>
      <div class="sm muted num">${step + 1} / ${total}</div>
      <div class="q">${cur.q}</div>
      ${body}
      <div class="nav"><button class="btn btn-ghost" id="wzPrev" ${step === 0 ? "disabled" : ""}>이전</button><button class="btn btn-accent" id="wzNext">${step === total - 1 ? "견적 요청 올리기" : "다음"}</button></div>
    </div></div>`;
  }
  function vProposals() {
    const a = st.wiz.a, pool = SV.filter(s => s.cat === a.cat);
    const picks = (pool.length ? pool : SV).slice(0, 3);
    const msgs = ["요청 내용 확인했어요. 비슷한 채널을 여러 번 작업해 봐서 톤을 빨리 맞출 수 있습니다. 첫 편은 시안으로 먼저 보여드릴게요.", "분량이 많으면 템플릿을 먼저 만들어 두고 진행하는 게 효율적이에요. 그 방식으로 일정 잡아 제안드립니다.", "레퍼런스 톤 기준으로 가격 책정했어요. 급하시면 빠른 납품 옵션도 가능합니다."];
    return `<div class="wrap"><div class="wiz">
      <div class="notice ok">${icon(I.check, 18)}<span><b>견적 요청을 올렸어요.</b> '${esc(a.title)}' 요청에 제안이 도착하면 알림톡과 이메일로 알려드립니다. 아래는 예시 제안입니다.</span></div>
      <h1 style="font-size:20px">도착한 제안 <span class="muted" style="font-weight:500;font-size:15px">3건</span></h1>
      ${picks.map((s, i) => { const c = cre(s.cr), pi = 1, p = s.pk[pi]; return `<div class="prop"><div class="top"><span class="big-av" style="background:${c.color};width:44px;height:44px;font-size:15px">${c.init}</span><div><b>${esc(c.name)}</b> <span class="tag">${c.level}</span><div class="sm muted">${c.role} · 평점 ${c.rate} · 응답 ${c.resp}</div></div><div class="pr"><b class="num">${won(p.price)}</b><span>작업 ${p.days}일 · 수정 ${p.rev}회</span></div></div><p>${msgs[i]}</p><div class="act"><button class="btn btn-accent" data-acc="${s.id}:${pi}">제안 수락하고 결제</button><a class="btn btn-line" href="#creator-${c.id}">프로필 보기</a></div></div>`; }).join("")}
      <button class="link" id="wzReset" style="align-self:flex-start">새 요청 작성</button>
    </div></div>`;
  }

  /* ---------- creator apply / center ---------- */
  function vApply() {
    return `<div class="wrap">
      <div class="apply-hero"><div><span class="eyebrow" style="color:var(--accent);font-weight:700;letter-spacing:.1em;font-size:13px">FOR CREATORS</span><h1>Edit for Korean brands.<br>Get paid per project.</h1><p>LIKHA connects Filipino video editors and designers with Korean YouTube channels, clinics, and e-commerce brands. A Korean PM reviews every delivery, so you learn Korean-style editing fast.</p><div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap"><a class="btn btn-accent btn-lg" href="#apply-form" data-jump="apply-form">Apply now</a><a class="btn btn-line btn-lg" href="#category-all">See services</a></div></div>
        <div class="benefits"><div><b>Steady orders from Korea</b><span>Not one-off gigs: monthly volume from channels that post every day.</span></div><div><b>Free 2-week academy</b><span>Korean subtitle style, short-form hooks, AI editing tools.</span></div><div><b>PHP payouts via GCash or bank</b><span>Per project, on a fixed schedule. No application fees, ever.</span></div></div></div>
      <div class="panel" id="apply-form" style="max-width:720px;margin:24px auto 60px;scroll-margin-top:100px"><h2>Application</h2>
        <form id="applyForm" novalidate style="display:flex;flex-direction:column;gap:14px">
          <div class="two"><div class="field"><label for="ap-name">Full name</label><input type="text" id="ap-name"></div><div class="field"><label for="ap-email">Email</label><input type="email" id="ap-email"></div></div>
          <div class="two"><div class="field"><label for="ap-role">Specialty</label><select id="ap-role"><option>Short-form editor (Reels/TikTok/Shorts)</option><option>YouTube long-form editor</option><option>Thumbnail / graphic designer</option><option>Motion graphics / AI video</option></select></div><div class="field"><label for="ap-tools">Main tools</label><input type="text" id="ap-tools" placeholder="Premiere Pro, CapCut, Photoshop…"></div></div>
          <div class="field"><label for="ap-pf">Portfolio link</label><input type="url" id="ap-pf" placeholder="https://"></div>
          <div class="field"><label for="ap-msg">Tell us about your experience</label><textarea id="ap-msg"></textarea></div>
          <p class="err" id="ap-err" hidden>Please fill in your name, email and portfolio link.</p>
          <button class="btn btn-accent btn-lg" type="submit" style="align-self:flex-start">Submit application</button>
          <p class="xs muted">No application or training fees. Your information is used only for recruitment (Data Privacy Act of 2012).</p>
        </form></div>
    </div>`;
  }
  function vSeller() {
    const rows = [["LK-2610-1043", "박**", "쇼츠 3편 (DELUXE)", "work", "10/30"], ["LK-2610-1042", "이**", "썸네일 3종", "review", "10/29"], ["LK-2610-1039", "최**", "쇼츠 5편", "delivered", "10/28"], ["LK-2610-1035", "정**", "릴스 10편 묶음", "work", "11/04"], ["LK-2610-1031", "김**", "쇼츠 1편", "done", "10/24"]];
    const en = { work: "In progress", review: "PM review", delivered: "Delivered", done: "Completed" };
    return `<div class="wrap">
      <div class="cp-head" style="justify-content:space-between"><div><span class="sm muted">Creator Center</span><h1>Welcome back, Maria</h1></div><button class="btn btn-accent" id="newSvc">+ New service</button></div>
      <div class="kpis"><div class="kpi"><b class="num">2</b><span>In progress</span></div><div class="kpi"><b class="num">1</b><span>Waiting for PM review</span></div><div class="kpi"><b class="num">4.9</b><span>Rating (163)</span></div><div class="kpi"><b class="num">98%</b><span>On-time delivery</span></div></div>
      <div class="tblwrap" style="margin-top:16px"><table><thead><tr><th>Order</th><th>Client</th><th>Package</th><th>Status</th><th>Due</th><th></th></tr></thead><tbody>
        ${rows.map(r => `<tr><td class="num">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td><span class="status s-${r[3]}">${en[r[3]]}</span></td><td class="num">${r[4]}</td><td>${r[3] === "work" ? '<button class="link" data-upload>Upload delivery</button>' : ""}</td></tr>`).join("")}
      </tbody></table></div>
      <div class="notice info" style="margin:16px 0 48px">${icon(I.won, 18)}<span><b>Payouts</b> are made in PHP via GCash or bank transfer on a fixed schedule. Client prices are not shown in the Creator Center.</span></div>
    </div>`;
  }

  /* ---------- legal ---------- */
  function vLegal(k) {
    const T2 = {
      terms: ["이용약관", `<h2>제1조 (목적)</h2><p>이 약관은 <span class="ph">[상호]</span>(이하 "회사")가 운영하는 LIKHA(이하 "서비스")에서 회사가 판매하는 영상 편집·디자인 용역의 이용 조건을 정합니다.</p>
        <h2>제2조 (판매 주체)</h2><p>서비스에 등록된 모든 상품은 회사가 판매하며, 크리에이터는 회사와 계약한 작업자입니다. 주문, 결제, 환불의 책임은 회사에 있습니다.</p>
        <h2>제3조 (주문과 진행)</h2><ol><li>이용자는 상품의 패키지와 옵션을 선택해 결제합니다.</li><li>요구사항을 제출하면 작업이 시작되고, 한국 PM의 검수를 거쳐 납품됩니다.</li><li>이용자는 납품 후 7일 안에 구매 확정 또는 수정 요청을 할 수 있으며, 기간이 지나면 자동으로 구매 확정됩니다.</li></ol>
        <h2>제4조 (저작권)</h2><p>결과물의 저작재산권은 구매 확정 시점에 크리에이터에서 회사를 거쳐 이용자에게 양도됩니다. 회사는 이용자의 동의 없이 결과물을 홍보에 사용하지 않습니다.</p>
        <h2>제5조 (원본 관리)</h2><p>이용자가 제공한 원본은 회사 클라우드에서만 보관하며, 구매 확정 후 90일이 지나면 삭제합니다.</p>`],
      refund: ["취소 및 환불 규정", `<h2>요구사항 제출 전</h2><p>결제 후 요구사항을 제출하지 않았다면 전액 환불합니다. 결제 수단으로 즉시 취소됩니다.</p>
        <h2>작업 시작 후</h2><ul><li>작업 중 취소하면 진행 정도를 확인해 남은 분량만큼 환불합니다.</li><li>납품 후에는 수정 요청으로 해결하며, 구매 확정 후에는 환불되지 않습니다.</li><li>회사의 귀책으로 납기를 지키지 못하면 전액 환불합니다.</li></ul>
        <h2>환불 방법과 기간</h2><p>카드·간편결제는 결제 취소로, 계좌이체·가상계좌는 이용자 명의 계좌로 영업일 3~5일 안에 환불합니다.</p>`],
      privacy: ["개인정보 처리방침", `<h2>수집 항목</h2><p>이름, 연락처, 이메일, 사업자등록번호(선택), 주문·결제 기록. 카드 정보는 토스페이먼츠가 직접 처리하며 회사는 저장하지 않습니다.</p>
        <h2>이용 목적</h2><p>주문 처리와 납품, 결제와 세금계산서 발행, 고객 상담, 서비스 안내.</p>
        <h2>보관 기간</h2><p>탈퇴 시 지체 없이 파기합니다. 단, 전자상거래법에 따라 계약·결제 기록은 5년, 상담 기록은 3년 보관합니다.</p>
        <h2>국외 처리</h2><p>편집을 위해 원본 영상이 필리핀 소재 크리에이터에게 회사 클라우드를 통해 제공됩니다. 크리에이터는 회사와 비밀유지 계약을 맺습니다.</p>
        <h2>개인정보 보호책임자</h2><p>이철우 · yko0107@gmail.com</p>`]
    }[k];
    return `<div class="wrap legal"><h1>${T2[0]}</h1><p class="draft">초안입니다. 게시 전에 법률 검토가 필요합니다. 시행일: <span class="ph">[시행일]</span></p>${T2[1]}</div>`;
  }
  const vNotFound = () => `<div class="wrap">${empty("페이지를 찾을 수 없어요", "주소가 바뀌었거나 없는 페이지예요.", '<a class="btn btn-accent" href="#home">홈으로</a>')}</div>`;

  /* ---------- modal ---------- */
  let afterLogin = null;
  function modal(html) { $("#modalRoot").innerHTML = `<div class="modal-bg" id="mbg"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; const f = $("#modalRoot").querySelector("input,button"); f && f.focus(); }
  function closeModal() { $("#modalRoot").innerHTML = ""; }
  function loginModal(next) {
    afterLogin = next || null;
    modal(`<div style="display:flex;justify-content:space-between;align-items:center"><h2>로그인</h2><button class="btn btn-ghost btn-sm" data-close aria-label="닫기">${icon(I.x, 18)}</button></div><p class="muted sm">3초 만에 시작하고 주문을 이어가세요.</p>
      <button class="btn btn-lg btn-block kakao" data-dologin="kakao">카카오로 시작하기</button>
      <button class="btn btn-lg btn-block google" data-dologin="google">Google로 시작하기</button>
      <div class="or">또는 이메일</div>
      <div class="field"><input type="email" id="lg-email" placeholder="name@company.com"></div>
      <button class="btn btn-lg btn-block btn-dark" data-dologin="email">이메일로 계속</button>
      <p class="xs muted">계속하면 <a href="#terms" style="text-decoration:underline">이용약관</a>과 <a href="#privacy" style="text-decoration:underline">개인정보 처리방침</a>에 동의하는 것입니다. 데모: 어떤 버튼을 눌러도 로그인됩니다.</p>`);
  }
  function askModal(sid) { const s = svc(sid); if (!s) return; const c = cre(s.cr); modal(`<div style="display:flex;justify-content:space-between;align-items:center"><h2>${esc(c.name)}님에게 문의</h2><button class="btn btn-ghost btn-sm" data-close aria-label="닫기">${icon(I.x, 18)}</button></div><p class="muted sm">${esc(s.title)}</p><div class="field"><textarea id="ask-t" placeholder="원본 분량, 납기, 원하는 스타일을 적어 주세요"></textarea></div><button class="btn btn-accent btn-lg btn-block" id="askSend">문의 보내기</button><p class="xs muted">평균 응답 ${c.resp}</p>`); }

  /* ---------- chrome / router ---------- */
  function chrome(view) {
    $("#authSlot").innerHTML = st.user ? `<a class="nl d-only" href="#orders">내 주문</a><button class="avatar" id="logoutBtn" title="로그아웃">${esc((st.user.name || "회원").slice(0, 1))}</button>` : `<button class="nl" data-login>로그인</button><a class="btn btn-accent btn-sm d-only" href="#apply" style="margin-left:6px">크리에이터 등록</a>`;
    $$("#catnav a").forEach(a => a.classList.toggle("on", view === "category" && a.getAttribute("href") === "#category-" + st.cat));
    const tab = ["service", "creator", "category"].includes(view) ? "category" : view === "order" ? "orders" : view;
    $$("#tabbar a").forEach(a => a.classList.toggle("on", a.dataset.tab === tab));
    document.body.classList.toggle("hide-tabbar", view === "service" || view === "checkout");
    $("#mSearchWrap").hidden = !(view === "home" || view === "category");
    $("#hq").value = st.q; $("#mq").value = st.q;
    $("#mega").hidden = true;
  }
  let cur = "home", heroTimer = null;
  function render() {
    const h = (location.hash || "").slice(1) || "home";
    let view = h, html;
    if (h === "home") html = vHome();
    else if (h.startsWith("category-")) { const c = h.slice(9); if (c !== st.cat) { st.cat = c; st.sub = ""; } st.q = ""; view = "category"; html = vCategory(); }
    else if (h === "search") { view = "category"; html = vCategory(); }
    else if (h.startsWith("service-")) { view = "service"; html = vService(h.slice(8)); }
    else if (h.startsWith("creator-")) { view = "creator"; html = vCreator(h.slice(8)); }
    else if (h === "checkout") html = vCheckout();
    else if (h === "orders") html = vOrders();
    else if (h.startsWith("order-")) { view = "order"; html = st.user ? vOrder(h.slice(6)) : vOrders(); }
    else if (h === "request") html = vRequest();
    else if (h === "apply") html = vApply();
    else if (h === "seller") html = vSeller();
    else if (["terms", "refund", "privacy"].includes(h)) { view = "legal"; html = vLegal(h); }
    else { view = "404"; html = vNotFound(); }
    $("#app").innerHTML = html; cur = view; chrome(view);
    clearInterval(heroTimer);
    if (view === "home") { let i = 0; const sl = $$("#hero .slide"); const setHero = n => { i = n; sl.forEach((s, k) => s.classList.toggle("on", k === n)); $$("#hero [data-dot]").forEach((d, k) => d.classList.toggle("on", k === n)); $("#hero").className = "hero " + (sl[n].dataset.cls || ""); };
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) heroTimer = setInterval(() => setHero((i + 1) % sl.length), 6000);
      $("#hero").addEventListener("click", e => { const d = e.target.closest("[data-dot]"); if (d) { clearInterval(heroTimer); setHero(+d.dataset.dot); } }); }
    if (view === "category") { const s = $("#fSort"); if (s) s.value = st.sort; }
    if (view === "order") { const m = $("#msgs"); if (m) m.scrollTop = m.scrollHeight; }
    if (view === "service") mobilePkg();
    if (view === "checkout") mountCheckout();
  }
  function mobilePkg() { const m = $("#mPkg"), d = $("#dPkg"); if (!m || !d) return; const mob = matchMedia("(max-width:900px)").matches; if (mob && !m.innerHTML) { m.innerHTML = d.innerHTML; m.style.marginTop = "18px"; d.innerHTML = ""; } else if (!mob && !d.innerHTML) { d.innerHTML = m.innerHTML; m.innerHTML = ""; } }
  addEventListener("hashchange", () => { render(); scrollTo(0, 0); });
  matchMedia("(max-width:900px)").addEventListener("change", () => { if (cur === "service") mobilePkg(); });

  /* ---------- helpers ---------- */
  function goSearch(q) { st.q = q.trim(); st.cat = "all"; if (location.hash === "#search") render(); else location.hash = "search"; }
  $("#hSearch").addEventListener("submit", e => { e.preventDefault(); goSearch($("#hq").value); });
  $("#mSearch").addEventListener("submit", e => { e.preventDefault(); goSearch($("#mq").value); });
  const curOrder = () => st.orders.find(x => "order-" + x.id === location.hash.slice(1));
  function refreshPkg(s) { const box = $("#pkgBox"); if (!box) return; box.outerHTML = pkgBox(s); const bt = $("#barTotal"); if (bt) bt.textContent = $("#pkgTotal").textContent; const bp = document.querySelector(".buybar .bp span"); if (bp) bp.textContent = s.pk[st.pkg[s.id] ?? 1].n; }
  function startCheckout(sid, pi) { const go = () => { st.cart = { sid, pi: pi ?? (st.pkg[sid] ?? 1), opts: { ...(st.opts[sid] || {}) }, qty: st.qty[sid] || 1, coupon: "" }; location.hash = "checkout"; }; st.user ? go() : loginModal(go); }
  function createOrder(result) {
    const ck = st.cart, { s, p, opts, total } = cartCalc(ck);
    const d = new Date(); const due = new Date(d.getTime() + p.days * 864e5);
    const o = { id: st.seq++, orderId: result.orderId, sid: s.id, pi: ck.pi, optNames: opts.map(o => o.n), qty: ck.qty, amount: total, status: "paid", revs: 0, req: "", review: null, method: result.mock ? "mock" : "toss", paymentKey: result.paymentKey,
      date: d.toLocaleDateString("ko-KR"), due: due.toLocaleDateString("ko-KR"), msgs: [{ w: "LIKHA PM", t: "주문 감사합니다. 요구사항을 제출해 주시면 바로 크리에이터를 배정할게요." }] };
    st.orders.push(o); st.cart = null; save(); return o;
  }
  function advance(o) { const i = STEPS.findIndex(x => x[0] === o.status); if (i < STEPS.length - 1) { o.status = STEPS[i + 1][0]; if (o.status === "review") o.msgs.push({ w: "LIKHA PM", t: "편집본이 도착해 검수를 시작했어요." }); if (o.status === "delivered") o.msgs.push({ w: "LIKHA PM", t: "검수를 마치고 결과물을 올렸어요. 확인 후 구매 확정 또는 수정 요청을 해 주세요." }); save(); render(); } }
  const orderIdNew = () => "LK-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  /* ---------- events ---------- */
  document.addEventListener("click", async e => {
    const t = e.target;
    if (t.closest("#mbg") && !t.closest(".modal")) { closeModal(); return; }
    if (t.closest("[data-close]")) { closeModal(); return; }
    if (t.closest("[data-login]")) { loginModal(); return; }
    const dl = t.closest("[data-dologin]"); if (dl) { const em = ($("#lg-email") || {}).value || ""; st.user = { key: "user_" + Math.random().toString(36).slice(2, 10), name: em ? em.split("@")[0] : "김지은", email: em || "contact@example.com", phone: "010-1234-5678", via: dl.dataset.dologin }; save(); closeModal(); toast("로그인했어요"); const n = afterLogin; afterLogin = null; n ? n() : render(); return; }
    if (t.closest("#logoutBtn")) { st.user = null; save(); toast("로그아웃했어요"); location.hash = "home"; render(); return; }
    if (t.closest("#megaBtn")) { const m = $("#mega"); m.hidden = !m.hidden; return; }
    if (!t.closest("#mega") && !t.closest("#megaBtn")) $("#mega").hidden = true;
    const jump = t.closest("[data-jump]"); if (jump) { e.preventDefault(); const el = document.getElementById(jump.dataset.jump); if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); $$(".dtabs a").forEach(a => a.classList.toggle("on", a === jump)); } return; }
    /* category */
    if (t.closest("#fOpen")) { $("#filters").classList.add("open"); $("#fClose").style.display = "inline-flex"; return; }
    if (t.closest("#fClose")) { $("#filters").classList.remove("open"); return; }
    if (t.closest("#fApply")) { st.minP = $("#fMin").value; st.maxP = $("#fMax").value; render(); return; }
    const sub = t.closest("[data-sub]"); if (sub) { st.sub = sub.dataset.sub; $$("[data-sub]").forEach(x => x.classList.toggle("on", x === sub)); return; }
    if (t.closest("#clearQ")) { st.q = ""; render(); return; }
    /* service */
    const g = t.closest("[data-g]"); if (g) { $("#gMain").innerHTML = g.innerHTML; $$("[data-g]").forEach(x => x.classList.toggle("on", x === g)); return; }
    const pk = t.closest("[data-pk]"); if (pk) { const s = svc(location.hash.slice(9)); st.pkg[s.id] = +pk.dataset.pk; refreshPkg(s); return; }
    const q = t.closest("[data-q]"); if (q) { const s = svc(location.hash.slice(9)); st.qty[s.id] = Math.min(20, Math.max(1, (st.qty[s.id] || 1) + +q.dataset.q)); refreshPkg(s); return; }
    const buy = t.closest("[data-buy]"); if (buy) { startCheckout(+buy.dataset.buy); return; }
    const acc = t.closest("[data-acc]"); if (acc) { const [sid, pi] = acc.dataset.acc.split(":").map(Number); st.opts[sid] = {}; st.qty[sid] = 1; startCheckout(sid, pi); return; }
    const ask = t.closest("[data-ask]"); if (ask && ask.dataset.ask) { askModal(+ask.dataset.ask); return; }
    if (t.closest("#askSend")) { const v = $("#ask-t").value.trim(); if (!v) { $("#ask-t").focus(); return; } closeModal(); toast("문의를 보냈어요. 보통 1시간 안에 답이 와요"); return; }
    /* checkout */
    if (t.closest("#couponBtn")) { const ck = st.cart; ck.coupon = $("#coupon").value.trim().toUpperCase(); const { disc, total } = cartCalc(ck); if (ck.coupon && !disc) { toast("사용할 수 없는 쿠폰이에요"); ck.coupon = ""; } else if (disc) toast("쿠폰이 적용됐어요"); $("#discRow").textContent = disc ? "−" + won(disc) : "0원"; $("#totRow").textContent = won(total); $("#payLbl").textContent = won(total) + " 결제하기"; await PAY.setAmount(total); return; }
    if (t.closest("#payBtn")) {
      const need = ["o-name", "o-phone", "o-email"].map(id => $("#" + id)); const bad = need.filter(i => !i.value.trim()); $("#o-err").hidden = !bad.length; if (bad.length) { bad[0].focus(); return; }
      const ck = st.cart, { s, total } = cartCalc(ck); const b = $("#payBtn"); b.disabled = true; $("#payLbl").textContent = "결제 진행 중…";
      const pending = { orderId: orderIdNew(), sid: s.id, pi: ck.pi, opts: ck.opts, qty: ck.qty, coupon: ck.coupon, amount: total, name: need[0].value, email: need[2].value, phone: need[1].value, at: Date.now() };
      try { localStorage.setItem("likha-pending", JSON.stringify(pending)); } catch (x) { }
      try {
        const r = await PAY.request({ orderId: pending.orderId, orderName: s.title.slice(0, 40) + (ck.qty > 1 ? " 외" : ""), amount: total, customerName: pending.name, customerEmail: pending.email, customerMobilePhone: pending.phone.replace(/\D/g, "") });
        if (r.redirected) return;
        st.user = { ...st.user, name: pending.name, email: pending.email, phone: pending.phone };
        const o = createOrder(r); toast("결제가 완료됐어요 (테스트)"); location.hash = "order-" + o.id;
      } catch (err) { toast(err.message || "결제에 실패했어요. 다시 시도해 주세요."); b.disabled = false; $("#payLbl").textContent = won(total) + " 결제하기"; }
      return;
    }
    /* order */
    const adv = t.closest("[data-adv]"); if (adv) { advance(st.orders.find(x => x.id === +adv.dataset.adv)); return; }
    if (t.closest("#rqSend")) { const v = $("#rq-text").value.trim(); if (!v) { $("#rq-err").hidden = false; $("#rq-text").focus(); return; } const o = curOrder(); o.req = v; const f = $("#rq-file").files; o.msgs.push({ me: true, t: "요구사항을 제출했어요" + (f.length ? ` (파일 ${f.length}개)` : "") }); o.status = "work"; o.msgs.push({ w: cre(svc(o.sid).cr).name, t: "Got it! I'll start editing now. 작업 시작할게요!" }); save(); render(); return; }
    if (t.closest("#revBtn")) { $("#revForm").hidden = false; $("#rv-text").focus(); return; }
    if (t.closest("#revSend")) { const v = $("#rv-text").value.trim(); if (!v) { $("#rv-text").focus(); return; } const o = curOrder(); o.revs++; o.status = "work"; o.msgs.push({ me: true, t: "수정 요청: " + v }); save(); render(); toast("수정 요청을 보냈어요"); return; }
    if (t.closest("#confirmBtn")) { const o = curOrder(); o.status = "done"; save(); render(); toast("구매 확정했어요"); return; }
    const sb = t.closest("[data-star]"); if (sb) { const n = +sb.dataset.star; $$("#stars button").forEach(b => b.classList.toggle("on", +b.dataset.star <= n)); $("#stars").dataset.v = n; return; }
    if (t.closest("#rvwSend")) { const o = curOrder(); o.review = { sc: +($("#stars").dataset.v || 5), t: $("#rvw").value.trim() || "만족합니다." }; save(); render(); return; }
    /* wizard */
    if (t.closest("#wzPrev")) { st.wiz.step--; render(); return; }
    if (t.closest("#wzNext")) { const w = st.wiz, cur2 = WIZ[w.step]; if (cur2.type === "pick") { const v = document.querySelector("input[name=wz]:checked"); if (!v) { toast("하나를 골라 주세요"); return; } w.a[cur2.key] = v.value; } else { w.a.title = $("#wz-title").value.trim(); w.a.desc = $("#wz-desc").value.trim(); w.a.name = $("#wz-name").value.trim(); w.a.phone = $("#wz-phone").value.trim(); const ok = w.a.title && w.a.desc && w.a.phone; $("#wz-err").hidden = !!ok; if (!ok) return; st.props = true; toast("견적 요청을 올렸어요"); render(); return; } w.step++; render(); return; }
    if (t.closest("#wzReset")) { st.wiz = { step: 0, a: {} }; st.props = null; render(); return; }
    if (t.closest("[data-upload]")) { toast("Upload opens the file picker in the live app"); return; }
    if (t.closest("#newSvc")) { toast("Service form opens in the live app"); return; }
  });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.id === "fSort") { st.sort = t.value; render(); }
    if (t.id === "fFast") { st.fast = t.checked; render(); }
    if (t.name === "fc") { location.hash = "category-" + t.value; }
    if (t.dataset && t.dataset.opt !== undefined) { const s = svc(location.hash.slice(9)); st.opts[s.id] = st.opts[s.id] || {}; st.opts[s.id][t.dataset.opt] = t.checked; refreshPkg(s); }
    if (t.id === "rq-file") { $("#rq-list").innerHTML = [...t.files].map(f => `<li>${icon(I.doc, 14)} ${esc(f.name)} <span class="muted">${(f.size / 1048576).toFixed(1)}MB</span></li>`).join(""); }
  });
  document.addEventListener("likha:agree", updatePayBtn);
  document.addEventListener("submit", e => {
    if (e.target.id === "msgForm") { e.preventDefault(); const v = $("#msgIn").value.trim(); if (!v) return; const o = curOrder(); o.msgs.push({ me: true, t: v }); save(); render(); $("#msgIn").focus(); }
    if (e.target.id === "applyForm") { e.preventDefault(); const ok = $("#ap-name").value.trim() && $("#ap-email").value.trim() && $("#ap-pf").value.trim(); $("#ap-err").hidden = !!ok; if (!ok) return; e.target.innerHTML = `<div class="notice ok">${icon(I.check, 18)}<span><b>Application received.</b> We'll email you a short editing test within 2 business days.</span></div>`; }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); $("#mega").hidden = true; } });

  /* 토스 결제 후 success.html → 돌아왔을 때 */
  (function resumeFromToss() {
    try {
      const done = JSON.parse(localStorage.getItem("likha-paid") || "null"); if (!done) return;
      localStorage.removeItem("likha-paid");
      const pend = done.pending; if (!pend) return;
      if (!st.user) st.user = { key: "user_" + Math.random().toString(36).slice(2, 10), name: pend.name, email: pend.email, phone: pend.phone };
      st.cart = { sid: pend.sid, pi: pend.pi, opts: pend.opts || {}, qty: pend.qty || 1, coupon: pend.coupon || "" };
      const o = createOrder({ orderId: pend.orderId, paymentKey: done.paymentKey, mock: false });
      location.hash = "order-" + o.id;
    } catch (e) { }
  })();

  render();
})();
