/* LIKHA PM 관리 콘솔. LIVE: Supabase(pm/admin 역할만). DEMO: 시드 데이터로 화면만 확인. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const LIVE = !!(window.DB && window.DB.live), D = window.LIKHA_DATA, S = window.LIKHA_SEED, H = 36e5, DAY = 864e5;
  const won = (n) => "₩" + Math.round(n).toLocaleString("ko-KR"), php = (n) => "₱" + Math.round(n).toLocaleString("en-PH");
  const when = (x) => x ? new Date(x).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
  const toast = (m) => { const e = $("#toast"); e.textContent = m; e.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(() => e.classList.remove("on"), 2600); };
  const TYPE_N = { short: "숏폼", long: "유튜브 롱폼", thumb: "썸네일", sub: "자막", motion: "모션·인트로", ai: "AI 광고" };
  const OST = { pending_payment: ["결제 대기", ""], paid: ["결제 완료", "acc"], req: ["요구사항 접수", "warn"], work: ["작업 중", "brand"], review: ["검수 중", "warn"], delivered: ["납품", "ok"], done: ["구매 확정", "ok"], cancelled: ["취소", ""], refunded: ["환불", ""] };
  const TST = { offer: ["제안 중", "acc"], open: ["오픈", ""], work: ["작업 중", "brand"], review: ["검수 대기", "warn"], revision: ["수정 요청", "acc"], delivered: ["고객 전달", "ok"], done: ["정산 적립", "ok"], declined: ["거절", ""], expired: ["만료", ""] };
  const svc = (id) => D.SV.find((s) => s.id === id) || {};

  /* ---------- state ---------- */
  let st = { orders: [], tasks: [], creators: [], notifs: [], me: null, filter: {} };

  function demoData() {
    const now = Date.now();
    st.me = { id: "pm-demo", name: "PM (데모)", role: "pm" };
    st.creators = [{ id: "c1", name: "Maria Santos", level: 2, skills: ["short", "thumb", "sub"], tools: ["CapCut", "Premiere Pro"], capacity: 25, deliveries: 68, first_pass: 91, ontime: 97, city: "Las Piñas" }, { id: "c2", name: "Jex Mitchell", level: 1, skills: ["short", "motion"], tools: ["Premiere Pro", "After Effects"], capacity: 15, deliveries: 4, first_pass: 100, ontime: 100, city: "Cebu" }, { id: "c3", name: "Sean Edward", level: 1, skills: ["short", "ai"], tools: ["Premiere Pro", "DaVinci"], capacity: 20, deliveries: 0, first_pass: 0, ontime: 0, city: "Manila" }];
    const mk = (i, sid, pk, status, ago, name, co) => { const s = svc(sid); const p = s.pk[pk]; return { id: "o" + i, order_no: "LK-2611-10" + (40 + i), service_id: sid, package_code: p.n, qty: 1, options: [], amount: p.price, status, created_at: new Date(now - ago).toISOString(), due_at: new Date(now - ago + p.days * DAY).toISOString(), client: { name, company: co, email: "client" + i + "@example.com" }, requirements: status === "paid" ? null : { text: "채널 톤은 밝고 빠르게. 자막은 노란 강조. 레퍼런스 링크: https://youtube.com/shorts/…", files: [{ name: "raw_1105.mp4", size: 812000000 }] }, payment: { method: "카드", receiptUrl: "#" } }; };
    st.orders = [mk(1, 1, 1, "paid", 2 * H, "박**", "강남 피부과"), mk(2, 3, 0, "req", 9 * H, "이**", "절세연구소"), mk(3, 2, 2, "work", 2 * DAY, "최**", "스킨케어 쇼핑몰"), mk(4, 1, 0, "review", 3 * DAY, "김**", "부산 피트니스"), mk(5, 5, 1, "delivered", 5 * DAY, "정**", "대구 영어학원"), mk(6, 1, 0, "done", 9 * DAY, "박**", "강남 피부과")];
    st.tasks = S.TASKS.map((t) => ({ id: t.id, task_no: t.id, order_id: t.status === "review" ? "o4" : t.status === "work" ? "o3" : "o6", creator_id: t.status === "open" ? null : "c1", creator: t.status === "open" ? null : { name: "Maria Santos", level: 2 }, type: t.type, status: t.status, client_alias: t.client, brief: t.brief, files: t.files, refs: t.refs, fee_php: t.base || S.TYPES[t.type].fee, bonus_php: t.bonus || 0, min_level: t.minLevel || 1, max_rev: S.TYPES[t.type].maxRev, rev: t.rev || 0, due_at: new Date(t.due).toISOString(), deliverable: t.link ? { link: t.link } : null, rev_notes: t.revNotes, created_at: new Date(now - DAY).toISOString() }));
    st.notifs = [{ id: 1, kind: "nt_new_order", vars: { no: "LK-2611-1041" }, link: "#order/o1", read: false, created_at: new Date(now - 2 * H).toISOString() }, { id: 2, kind: "nt_review", vars: { no: "T-2611-0377" }, link: "#task/T-2611-0377", read: false, created_at: new Date(now - 5 * H).toISOString() }];
  }
  async function load() {
    if (!LIVE) return demoData();
    const [o, t, c, n, py] = await Promise.all([DB.orders.all(), DB.tasks.all(), DB.tasks.creators(), DB.notifs.list(), DB.sb.from("payouts").select("*, creator:profiles!payouts_creator_id_fkey(name, payout_method, payout_account)").order("created_at", { ascending: false }).then((r) => r.data || [])]);
    st.orders = o; st.tasks = t; st.creators = c; st.notifs = n; st.payouts = py; st.quotes = (await DB.sb.from("quote_requests").select("*").order("created_at", { ascending: false }).limit(100)).data || [];
  }
  const NT = { nt_new_order: (v) => "새 주문 " + v.no, nt_review: (v) => "검수 요청 " + v.no, nt_msg: (v) => "메시지: " + v.t, nt_paid: (v) => "결제 " + v.no, nt_claimed: (v) => "크리에이터가 작업 수락 " + v.no, nt_req: (v) => "고객 요구사항 제출 " + v.no, nt_client_rev: (v) => "고객 수정 요청 " + v.no, nt_confirmed: (v) => "고객 구매 확정 " + v.no, nt_failed: (v) => "결제 실패 " + v.no, nt_quote: (v) => "새 견적 요청: " + v.t };

  /* ---------- chrome ---------- */
  const NAV = [["orders", "주문"], ["quotes", "견적 요청"], ["tasks", "작업"], ["creators", "크리에이터"], ["payouts", "정산"], ["msgs", "메시지"]];
  function chrome() {
    const cur = (location.hash.slice(1) || "orders").split("/")[0];
    const on = (k) => (k === cur || (k === "orders" && cur === "order") || (k === "tasks" && cur === "task") ? " on" : "");
    const cnt = { orders: st.orders.filter((o) => ["paid", "req"].includes(o.status)).length, tasks: st.tasks.filter((t) => t.status === "review").length, quotes: (st.quotes || []).filter((q) => q.status === "new").length };
    const item = ([k, l]) => `<a href="#${k}" class="${on(k)}">${l}${cnt[k] ? `<span class="n">${cnt[k]}</span>` : ""}</a>`; const items = NAV.map(item).join("");
    $("#side").innerHTML = items + `<div class="sec" style="margin-top:14px">LIKHA</div><a href="index.html">고객 사이트</a><a href="creator.html">크리에이터 센터</a>`;
    $("#tab").innerHTML = NAV.filter(([k]) => k !== "quotes").map(item).join("");
    $("#avatar").textContent = st.me ? (st.me.name || "PM").slice(0, 2).toUpperCase() : "PM";
    const un = st.notifs.filter((n) => !n.read).length; $("#bellDot").hidden = !un; $("#bellDot").textContent = un;
    $("#ndrop").innerHTML = `<div class="hd"><span>알림</span><button type="button" id="readAll">모두 읽음</button></div>` + (st.notifs.length ? `<ul>${st.notifs.slice(0, 15).map((n) => `<li class="${n.read ? "" : "un"}" data-go="${esc(n.link || "")}" data-id="${n.id}"><i></i><div>${esc((NT[n.kind] || ((v) => n.kind))(n.vars || {}))}<span>${when(n.created_at)}</span></div></li>`).join("")}</ul>` : `<div class="empty">알림 없음</div>`);
  }

  /* ---------- views ---------- */
  const demoBar = () => LIVE ? "" : `<div class="demo-bar">데모 모드 — config.js 에 Supabase 키를 넣으면 실제 주문·작업·크리에이터 데이터로 동작합니다. 여기서 누르는 버튼은 이 브라우저에서만 바뀝니다.</div>`;
  function vOrders(f) {
    f = f || "todo"; const sets = { todo: ["paid", "req"], work: ["work", "review"], done: ["delivered", "done"], all: null };
    const list = st.orders.filter((o) => !sets[f] || sets[f].includes(o.status));
    return `<div class="ph"><div><h1>주문</h1><p>결제된 주문을 작업으로 쪼개서 크리에이터에게 배정합니다.</p></div></div>${demoBar()}
      <div class="tabs">${[["todo", "배정 필요"], ["work", "진행·검수"], ["done", "완료"], ["all", "전체"]].map(([k, l]) => `<button data-tab="${k}" class="${f === k ? "on" : ""}">${l}<span class="n">${st.orders.filter((o) => !sets[k] || sets[k].includes(o.status)).length}</span></button>`).join("")}</div>
      ${list.map((o) => { const s = svc(o.service_id), tk = st.tasks.filter((t) => t.order_id === o.id); return `<div class="row" data-go="#order/${o.id}"><div><div class="t">${esc(s.title || o.service_id)} · ${esc(o.package_code)}${o.qty > 1 ? " ×" + o.qty : ""}</div><div class="m"><span>${o.order_no}</span><span>${esc((o.client && (o.client.company || o.client.name)) || "")}</span><span>${when(o.created_at)}</span><span>마감 ${o.due_at ? new Date(o.due_at).toLocaleDateString("ko-KR") : "-"}</span><span>작업 ${tk.length}건</span></div></div><div style="text-align:right"><b>${won(o.amount)}</b><br><span class="pill ${OST[o.status][1]}">${OST[o.status][0]}</span></div></div>`; }).join("") || `<div class="empty">없음</div>`}`;
  }
  function vOrder(id) {
    const o = st.orders.find((x) => x.id === id); if (!o) return `<div class="empty">주문 없음</div>`;
    const s = svc(o.service_id), p = (s.pk || []).find((x) => x.n === o.package_code) || {}, tk = st.tasks.filter((t) => t.order_id === o.id), req = o.requirements || {};
    const CAT2TASK = { shorts: "short", long: "long", thumb: "thumb", motion: "motion", ai: "ai", sub: "sub" }; const ctask = S.TYPES[s.task] ? s.task : (S.TYPES[CAT2TASK[s.cat]] ? CAT2TASK[s.cat] : "short");
    return `<div class="ph"><div><a class="link" href="#orders">← 주문</a><h1 style="margin-top:6px">${esc(s.title)} · ${esc(o.package_code)}</h1><p>${o.order_no} · <span class="pill ${OST[o.status][1]}">${OST[o.status][0]}</span> · ${won(o.amount)} · ${esc((o.client && (o.client.company || o.client.name)) || "")}</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${o.status === "review" ? `<button class="btn btn-accent" data-ost="delivered" data-id="${o.id}">고객에게 납품</button>` : ""}${o.status === "req" || o.status === "paid" ? `<button class="btn btn-line" data-ost="work" data-id="${o.id}">작업 중으로</button>` : ""}<a class="btn btn-line" href="#msgs/order:${o.id}">고객 채팅</a></div></div>
      <div class="tdet"><div>
        <div class="panel"><h3>고객 요구사항</h3>${req.text ? `<div class="brief">${esc(req.text)}</div>` : `<div class="empty">아직 요구사항을 제출하지 않았습니다. 고객에게 안내 메시지를 보내세요.</div>`}
          ${(req.files || []).length ? `<ul class="flist" style="margin-top:10px">${req.files.map((f) => `<li><a class="link" href="#" data-dl-bucket="${esc(f.bucket || "sources")}" data-dl-path="${esc(f.path)}">📎 ${esc(f.name || f.path)}</a><span class="dl">${f.size ? (f.size / 1048576).toFixed(1) + "MB" : ""}</span></li>`).join("")}</ul>` : ""}</div>
        <div class="panel"><h3>작업 (${tk.length})</h3>${tk.map(taskRow).join("") || `<p class="muted sm">아직 작업을 만들지 않았습니다.</p>`}</div>
        <div class="panel"><h3>새 작업 만들기</h3><p class="sub">고객 요청을 영어 브리프로 정리합니다. 크리에이터는 아래 내용과 ₱ 작업비만 봅니다 — 고객 이름·판매가는 절대 넣지 마세요.</p>
          <form id="taskF" data-order="${o.id}">
            <div class="two"><div class="fld"><label>작업 유형</label><select name="type" class="sel">${Object.keys(S.TYPES).map((k) => `<option value="${k}" ${k === ctask ? "selected" : ""}>${TYPE_N[k]} · ₱${S.TYPES[k].fee}</option>`).join("")}</select></div><div class="fld"><label>고객 별칭 (업종 · 지역)</label><input name="alias" value="${esc(o.client && o.client.company ? o.client.company.replace(/[가-힣]+\s?/g, "").trim() || "Client" : "Client")}" placeholder="Skin clinic · Gangnam"></div></div>
            <div class="fld"><label>브리프 (English)</label><textarea name="brief" placeholder="Hook in first 2 s... captions: bold white, yellow keywords... music upbeat...">${esc(req.text ? "" : "")}</textarea></div>
            <div class="two"><div class="fld"><label>작업비 ₱ (기본값 = 유형 요율)</label><input name="fee" type="number" value="${S.TYPES[ctask].fee}"></div><div class="fld"><label>마감</label><input name="due" type="datetime-local" value="${new Date(Date.now() + 2 * DAY).toISOString().slice(0, 16)}"></div></div>
            <div class="two"><div class="fld"><label>배정</label><select name="creator" class="sel"><option value="">오픈 보드에 올리기</option>${st.creators.map((c) => `<option value="${c.id}">${esc(c.name)} · Lv.${c.level} · ${(c.skills || []).map((k) => TYPE_N[k]).join(",")}</option>`).join("")}</select></div><div class="fld"><label>최소 레벨 (오픈일 때)</label><select name="minLevel" class="sel"><option>1</option><option>2</option><option>3</option></select></div></div>
            <div class="fld"><label>원본 파일 / 레퍼런스 (줄바꿈으로 구분)</label><textarea name="files" placeholder="raw_1105.mp4&#10;refs/ref_01.mp4">${esc((req.files || []).map((f) => f.name || f.path).join("\n"))}</textarea></div>
            <button class="btn btn-accent">작업 생성 ${""}</button></form></div>
      </div><div class="sticky-act">
        <div class="panel"><dl class="kv"><dt>패키지</dt><dd>${esc(p.desc || o.package_code)}</dd><dt>납기</dt><dd>${p.days || "-"}일</dd><dt>수정</dt><dd>${p.rev || "-"}회</dd><dt>결제</dt><dd>${esc((o.payment && o.payment.method) || "-")}${o.payment && o.payment.receiptUrl ? ` · <a class="link" href="${esc(o.payment.receiptUrl)}" target="_blank">영수증</a>` : ""}</dd><dt>고객</dt><dd>${esc((o.client && o.client.name) || "")}<br><span class="sm muted">${esc((o.client && o.client.email) || "")}</span></dd></dl></div>
        <div class="panel"><h3>크리에이터 작업비 합계</h3><b style="font-size:24px">${php(tk.reduce((a, t) => a + (t.fee_php || 0) + (t.bonus_php || 0), 0))}</b><p class="sub" style="margin-top:6px">≈ ${won(tk.reduce((a, t) => a + (t.fee_php || 0) + (t.bonus_php || 0), 0) * 24)} · 판매가 대비 ${o.amount ? Math.round(tk.reduce((a, t) => a + (t.fee_php || 0) + (t.bonus_php || 0), 0) * 24 / o.amount * 100) : 0}%</p></div>
      </div></div>`;
  }
  const taskRow = (t) => `<div class="row" data-go="#task/${t.id}"><div><div class="t"><span class="ty">${TYPE_N[t.type]}</span> ${esc(t.client_alias)} <span class="id" style="font-family:ui-monospace,monospace;font-size:12px;color:var(--faint)">${t.task_no}</span></div><div class="m"><span>${t.creator ? esc(t.creator.name) + " · Lv." + t.creator.level : "미배정"}</span><span>마감 ${when(t.due_at)}</span>${t.rev ? `<span>수정 ${t.rev}/${t.max_rev}</span>` : ""}</div></div><div style="text-align:right"><b>${php(t.fee_php + (t.bonus_php || 0))}</b><br><span class="pill ${TST[t.status][1]}">${TST[t.status][0]}</span></div></div>`;
  function vTasks(f) {
    f = f || "review"; const sets = { review: ["review"], active: ["offer", "open", "work", "revision"], done: ["delivered", "done"], all: null };
    const list = st.tasks.filter((t) => !sets[f] || sets[f].includes(t.status));
    return `<div class="ph"><div><h1>작업</h1><p>검수 대기부터 처리하세요. 통과시키면 고객에게 전달되고, 구매 확정 후 적립됩니다.</p></div></div>${demoBar()}
      <div class="tabs">${[["review", "검수 대기"], ["active", "진행 중"], ["done", "완료"], ["all", "전체"]].map(([k, l]) => `<button data-tab="${k}" class="${f === k ? "on" : ""}">${l}<span class="n">${st.tasks.filter((t) => !sets[k] || sets[k].includes(t.status)).length}</span></button>`).join("")}</div>${list.map(taskRow).join("") || `<div class="empty">없음</div>`}`;
  }
  function vTask(id) {
    const t = st.tasks.find((x) => x.id === id); if (!t) return `<div class="empty">작업 없음</div>`; const o = st.orders.find((x) => x.id === t.order_id);
    return `<div class="ph"><div><a class="link" href="#tasks">← 작업</a><h1 style="margin-top:6px">${TYPE_N[t.type]} · ${esc(t.client_alias)}</h1><p>${t.task_no} · <span class="pill ${TST[t.status][1]}">${TST[t.status][0]}</span> · ${t.creator ? esc(t.creator.name) + " Lv." + t.creator.level : "미배정"} · 마감 ${when(t.due_at)}${o ? ` · <a class="link" href="#order/${o.id}">${o.order_no}</a>` : ""}</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-line" href="#msgs/task:${t.id}">크리에이터 채팅</a>${t.status === "delivered" ? `<button class="btn btn-brand" data-tst="done" data-id="${t.id}">정산 적립</button>` : ""}</div></div>
      <div class="tdet"><div>
        ${t.status === "review" ? `<div class="panel"><h3>검수</h3><p class="sub">납품: ${t.deliverable && t.deliverable.link ? `<a class="link" href="${esc(t.deliverable.link)}" target="_blank">${esc(t.deliverable.link)}</a>` : "-"}${t.deliverable && t.deliverable.note ? ` · ${esc(t.deliverable.note)}` : ""}</p>
          <div class="chk">${(S.CHECKLIST[t.type] || []).map((c) => `<label><input type="checkbox">${esc(c)}</label>`).join("")}</div>
          <div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-accent" data-tst="delivered" data-id="${t.id}">통과 → 고객 전달</button><button class="btn btn-line" id="revOpen">수정 요청</button></div>
          <form id="revF" data-id="${t.id}" hidden style="margin-top:12px"><div class="fld"><label>수정 요청 내용 (English — 구체적으로, 타임코드 포함)</label><textarea name="notes" placeholder="Timing drifts after 04:10 by ~300 ms — re-sync from there. Line 37: keep 임플란트 in Korean."></textarea></div><button class="btn btn-dark">수정 요청 보내기 (${t.rev}/${t.max_rev} 사용)</button></form></div>` : ""}
        ${t.status === "revision" ? `<div class="panel"><h3>보낸 수정 요청</h3><div class="revbox">${esc(t.rev_notes)}</div></div>` : ""}
        <div class="panel"><h3>브리프</h3><div class="brief">${esc(t.brief)}</div></div>
        <div class="panel"><h3>파일 · 레퍼런스</h3><ul class="flist">${[...(t.files || []), ...(t.refs || [])].map((f) => { const x = typeof f === "string" ? f : f.name; const m = /^(.*?)\s*\|\s*(https?:\/\/\S+)$/.exec(x); const name = m ? m[1] : x, url = m ? m[2] : (/^https?:\/\//.test(x) ? x : null); return url ? `<li><a class="link" href="${esc(url)}" target="_blank" rel="noopener">📎 ${esc(name)}</a></li>` : `<li>📎 ${esc(name)}</li>`; }).join("") || "<li>-</li>"}</ul></div>
      </div><div class="sticky-act">
        <div class="panel"><dl class="kv"><dt>작업비</dt><dd>${php(t.fee_php)}</dd><dt>레벨 보너스</dt><dd>${php(t.bonus_php || 0)}</dd><dt>합계</dt><dd><b>${php(t.fee_php + (t.bonus_php || 0))}</b></dd><dt>수정</dt><dd>${t.rev}/${t.max_rev}</dd><dt>최소 레벨</dt><dd>${t.min_level}</dd></dl></div>
        ${["offer", "open"].includes(t.status) ? `<div class="panel"><h3>재배정</h3><form id="assignF" data-id="${t.id}"><select name="creator" class="sel" style="width:100%;margin-bottom:8px"><option value="">오픈 보드</option>${st.creators.map((c) => `<option value="${c.id}" ${t.creator_id === c.id ? "selected" : ""}>${esc(c.name)} · Lv.${c.level}</option>`).join("")}</select><button class="btn btn-line" style="width:100%">배정 변경</button></form></div>` : ""}
      </div></div>`;
  }
  function vCreators() {
    return `<div class="ph"><div><h1>크리에이터</h1><p>레벨은 분기마다 검토. 보너스 +10/20/30%.</p></div></div>${demoBar()}
      <div class="panel led"><span class="scrollhint">← 좌우로 스크롤 →</span><table><thead><tr><th>이름</th><th>레벨</th><th>할 수 있는 작업</th><th>툴</th><th class="n">주당</th><th class="n">납품</th><th class="n">1회 통과</th><th class="n">기한</th><th></th></tr></thead><tbody>
      ${st.creators.map((c) => `<tr><td><b>${esc(c.name)}</b><br><span class="sm muted">${esc(c.city || "")} ${c.email ? "· " + esc(c.email) : ""}</span></td><td><select class="sel" data-lvl="${c.id}">${[1, 2, 3, 4].map((n) => `<option ${c.level === n ? "selected" : ""}>${n}</option>`).join("")}</select></td><td>${(c.skills || []).map((k) => `<span class="pill">${TYPE_N[k]}</span>`).join(" ")}</td><td class="sm">${(c.tools || []).join(", ")}</td><td class="n">${c.capacity}</td><td class="n">${c.deliveries}</td><td class="n">${c.first_pass}%</td><td class="n">${c.ontime}%</td><td><a class="link" href="#msgs/pm:${c.id}">채팅</a></td></tr>`).join("")}</tbody></table></div>`;
  }
  const QL = { vol: { one: "1회성", m10: "월 10~30편", m30: "월 30~100편", m100: "월 100편+" }, due: { d3: "3일 이내", w1: "1주 이내", w2: "2주 이내", flex: "협의" }, budget: { b1: "~30만", b2: "30~100만", b3: "100~300만", b4: "300만+", b0: "미정" }, cat: { shorts: "숏폼", long: "롱폼", thumb: "썸네일", motion: "모션", ai: "AI", sub: "자막" } };
  const QST = { new: ["신규", "acc"], contacted: ["연락함", "brand"], converted: ["주문 전환", "ok"], closed: ["종료", ""] };
  function vQuotes() {
    const qs = st.quotes || []; const q = (k, v) => (QL[k] && QL[k][v]) || v || "-";
    return `<div class="ph"><div><h1>견적 요청</h1><p>고객이 「맞춤 견적」으로 올린 요청입니다. 연락 후 상태를 바꾸고, 주문으로 이어지면 「주문 전환」.</p></div></div>${demoBar()}
      ${qs.map((r) => `<div class="row" style="align-items:flex-start"><div style="min-width:0"><div class="t"><span class="pill ${QST[r.status][1]}">${QST[r.status][0]}</span> ${esc(r.title)}</div>
        <div class="sub">${q("cat", r.cat)} · ${q("vol", r.vol)} · 납기 ${q("due", r.due)} · 예산 ${q("budget", r.budget)} · ${when(r.created_at)}</div>
        <div class="sub" style="margin-top:6px;white-space:pre-wrap;color:var(--fg-2)">${esc(r.description || "")}</div>
        <div class="sub" style="margin-top:6px"><b>${esc(r.name || "-")}</b> · <a class="link" href="tel:${esc(r.phone || "")}">${esc(r.phone || "")}</a>${r.email ? ` · <a class="link" href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : ""}</div></div>
        <div style="display:flex;flex-direction:column;gap:6px"><select class="sel" data-qst="${r.id}" style="height:34px;font-size:13px">${Object.keys(QST).map((k) => `<option value="${k}" ${k === r.status ? "selected" : ""}>${QST[k][0]}</option>`).join("")}</select></div></div>`).join("") || `<div class="empty">아직 견적 요청이 없습니다.</div>`}`;
  }
  function vPayouts() {
    const done = st.tasks.filter((t) => t.status === "done" && !t.paid_out); const by = {};
    done.forEach((t) => { const k = t.creator_id || "?"; by[k] = by[k] || { c: t.creator || st.creators.find((c) => c.id === k) || { name: k }, items: [], sum: 0 }; by[k].items.push(t); by[k].sum += t.fee_php + (t.bonus_php || 0); });
    const d = new Date(), nxt = d.getDate() < 15 ? "15일" : "30일";
    return `<div class="ph"><div><h1>정산</h1><p>구매 확정된 작업을 크리에이터별로 묶어 15일·30일에 지급합니다. 다음 지급: ${d.getMonth() + 1}월 ${nxt}</p></div></div>${demoBar()}
      ${Object.keys(by).map((k) => `<div class="panel" style="margin-bottom:12px"><h3>${esc(by[k].c.name)} <span>${php(by[k].sum)} <button class="btn btn-brand" style="height:34px;font-size:13px;margin-left:8px" data-payout="${k}" data-sum="${by[k].sum}">지급 생성</button></span></h3><div class="led"><table><thead><tr><th>작업</th><th>완료</th><th class="n">기본</th><th class="n">보너스</th><th class="n">합계</th></tr></thead><tbody>${by[k].items.map((t) => `<tr><td>${t.task_no} · ${TYPE_N[t.type]} · ${esc(t.client_alias)}</td><td>${when(t.done_at)}</td><td class="n">${php(t.fee_php)}</td><td class="n">${php(t.bonus_php || 0)}</td><td class="n"><b>${php(t.fee_php + (t.bonus_php || 0))}</b></td></tr>`).join("")}</tbody></table></div></div>`).join("") || `<div class="empty">지급할 적립 건이 없습니다.</div>`}
      ${LIVE ? `<div class="panel" style="margin-bottom:12px"><h3>예정된 지급 <span class="sm muted">GCash/Maya/은행으로 송금 후 「송금 완료」</span></h3>${(st.payouts || []).filter((p) => p.status === "scheduled").map((p) => { const acc = (p.creator && p.creator.payout_account) || {}; const m = (p.creator && p.creator.payout_method) || "-"; return `<div class="row"><div><div class="t">${esc(p.creator ? p.creator.name : p.creator_id)} · <b>${php(p.amount_php)}</b></div><div class="sub">${p.period_start} ~ ${p.period_end} · ${esc(m.toUpperCase())} ${esc(acc.number || acc.account || "")} ${esc(acc.name || acc.holder || "")}${!acc.number && !acc.account ? ' <span style="color:var(--accent)">(크리에이터가 지급 수단 미입력)</span>' : ""}</div></div><div><button class="btn btn-brand" style="height:34px;font-size:13px" data-paid="${p.id}">송금 완료</button></div></div>`; }).join("") || `<p class="muted sm">예정된 지급이 없습니다.</p>`}
      <h3 style="margin-top:14px">지급 완료</h3>${(st.payouts || []).filter((p) => p.status === "paid").slice(0, 20).map((p) => `<div class="row"><div><div class="t">${esc(p.creator ? p.creator.name : "")} · ${php(p.amount_php)}</div><div class="sub">${p.period_start} ~ ${p.period_end} · ${when(p.paid_at)}${p.ref ? " · " + esc(p.ref) : ""}</div></div></div>`).join("") || `<p class="muted sm">아직 없음</p>`}</div>` : ""}
      <div class="panel"><h3>원화 환산 참고</h3><p class="sub">₱1 ≈ ₩24 기준. 실제 송금 시 환율과 수수료는 LIKHA 부담. GCash 대량 송금은 Wise Business 또는 GCash for Business 사용.</p></div>`;
  }
  function vMsgs(k) {
    if (!LIVE) return `<div class="ph"><div><h1>메시지</h1></div></div>${demoBar()}<div class="empty">실서비스 모드에서 고객·크리에이터 스레드가 여기 표시됩니다. (Supabase Realtime)</div>`;
    return `<div class="ph"><div><h1>메시지</h1></div></div><div class="msgs ${k ? "mobile-td" : "mobile-th"}"><div class="thl" id="thl"><div class="sec">스레드</div></div><div class="thd" id="thd"><div class="nothread">스레드를 선택하세요</div></div></div>`;
  }
  async function mountMsgs(k) {
    const ths = await DB.threads.list(); const me = DB.auth.user.id;
    $("#thl").innerHTML = `<div class="sec">스레드</div>` + ths.map((t) => { const nm = t.kind === "task" ? "작업 " + (t.task ? t.task.task_no + " · " + t.task.client_alias : "") : t.kind === "order" ? "주문 " + (t.order ? t.order.order_no : "") : t.kind === "support" ? "지원" : "PM"; return `<a href="#msgs/${t.id}" class="${t.id === k ? "on" : ""}"><span class="av ${t.kind === "support" ? "sup" : ""}">${t.kind === "order" ? "고" : t.kind === "task" ? "크" : "LK"}</span><div><div class="nm">${esc(nm)}</div><div class="pv">${when(t.last_at)}</div></div></a>`; }).join("");
    if (k && k.includes(":")) { const [kind, id] = k.split(":"); const th = kind === "task" ? await DB.threads.ensure("task", { task_id: id }, [(st.tasks.find((t) => t.id === id) || {}).creator_id]) : kind === "order" ? await DB.threads.ensure("order", { order_id: id }, [(st.orders.find((o) => o.id === id) || {}).client_id]) : await DB.threads.ensure("pm", null, [id]); location.hash = "#msgs/" + th.id; return; }
    if (!k) return;
    const msgs = await DB.threads.messages(k); await DB.threads.markRead(k);
    $("#thd").innerHTML = `<div class="hd"><b>스레드</b><span class="sm muted" style="margin-left:8px">내가 쓴 한국어는 상대 언어로 자동 번역됩니다</span></div><div class="body" id="mbody">${msgs.map((m) => `<div class="bub ${m.sender_id === me ? "me" : ""}"><div class="b">${esc(m.text)}</div><span class="t">${esc(m.sender ? m.sender.name : "")} · ${when(m.created_at)}${m.tr && m.tr.ko && m.sender_id !== me && m.lang !== "ko" ? ` · <span style="color:var(--brand)">번역: ${esc(m.tr.ko)}</span>` : ""}</span></div>`).join("")}</div><form id="chatF" data-th="${k}"><input name="m" autocomplete="off" placeholder="메시지 (한국어로 쓰세요)"><button class="btn btn-brand">보내기</button></form>`;
    const b = $("#mbody"); b.scrollTop = b.scrollHeight;
    if (mountMsgs.unsub) mountMsgs.unsub(); mountMsgs.unsub = DB.threads.subscribe(k, (m) => { if (m.sender_id === me) return; b.innerHTML += `<div class="bub"><div class="b">${esc(m.text)}</div><span class="t">${when(m.created_at)}</span></div>`; b.scrollTop = b.scrollHeight; });
  }

  /* ---------- router ---------- */
  function render() {
    const parts = (location.hash.slice(1) || "orders").split("/"), v = parts[0], a = parts.slice(1).join("/");
    let html = v === "order" ? vOrder(a) : v === "tasks" ? vTasks(a) : v === "task" ? vTask(a) : v === "creators" ? vCreators() : v === "payouts" ? vPayouts() : v === "quotes" ? vQuotes() : v === "msgs" ? vMsgs(a) : vOrders(a);
    $("#main").innerHTML = html; chrome(); window.scrollTo(0, 0);
    if (v === "msgs" && LIVE) mountMsgs(a);
  }
  function gate(msg) { $("#main").innerHTML = `<div class="panel" style="max-width:440px;margin:60px auto;text-align:center"><h2 style="font-size:22px;font-weight:800">PM 관리</h2><p class="muted" style="margin:8px 0 18px">${msg}</p><button class="btn btn-dark" id="gLogin" style="width:100%">Google로 로그인</button></div>`; chrome(); }

  /* ---------- actions ---------- */
  async function setOrder(id, status) { const o = st.orders.find((x) => x.id === id); if (!o) return; if (LIVE) { const dels = status === "delivered" ? st.tasks.filter((t) => t.order_id === id && ["delivered", "done"].includes(t.status) && t.deliverable && t.deliverable.link).map((t) => ({ task_no: t.task_no, type: t.type, link: t.deliverable.link, note: t.deliverable.note || "" })) : null; await DB.orders.update(id, { status, ...(status === "delivered" ? { delivered_at: new Date().toISOString(), deliverables: dels } : {}) }); await DB.orders.event(id, status, {}); if (status === "delivered") DB.notifs.push(o.client_id, "nt_delivered", { no: o.order_no }, "#order-" + id); await load(); } else o.status = status; toast("주문 상태: " + OST[status][0]); render(); }
  async function setTask(id, status, extra) {
    const t = st.tasks.find((x) => x.id === id); if (!t) return;
    const patch = { status, ...(extra || {}) }; if (status === "delivered") patch.passed_at = new Date().toISOString(); if (status === "done") patch.done_at = new Date().toISOString(); if (status === "revision") patch.rev = (t.rev || 0) + 1;
    if (LIVE) { await DB.tasks.update(id, patch); if (status === "delivered") { const o = st.orders.find((x) => x.id === t.order_id); if (o && o.status !== "delivered") await DB.orders.update(o.id, { status: "review" }); } await load(); } else Object.assign(t, patch, status === "revision" ? { rev_notes: extra.rev_notes } : {});
    toast("작업 상태: " + TST[status][0]); render();
  }
  document.addEventListener("click", async (e) => {
    const go = e.target.closest("[data-go]"); if (go && !e.target.closest("button,a,select,input")) { location.hash = go.dataset.go; return; }
    if (e.target.closest("#bell")) { $("#ndrop").hidden = !$("#ndrop").hidden; return; }
    if (!e.target.closest("#ndrop") && !$("#ndrop").hidden) $("#ndrop").hidden = true;
    if (e.target.closest("#readAll")) { st.notifs.forEach((n) => (n.read = true)); if (LIVE) DB.notifs.readAll(); chrome(); return; }
    const nl = e.target.closest("#ndrop li"); if (nl) { const n = st.notifs.find((x) => String(x.id) === nl.dataset.id); if (n) { n.read = true; if (LIVE) DB.notifs.read(n.id); } $("#ndrop").hidden = true; if (nl.dataset.go) location.hash = nl.dataset.go.replace(/^admin\.html/, ""); chrome(); return; }
    const tb = e.target.closest(".tabs [data-tab]"); if (tb) { location.hash = "#" + location.hash.slice(1).split("/")[0] + "/" + tb.dataset.tab; return; }
    const os = e.target.closest("[data-ost]"); if (os) { setOrder(os.dataset.id, os.dataset.ost); return; }
    const ts = e.target.closest("[data-tst]"); if (ts) { setTask(ts.dataset.id, ts.dataset.tst); return; }
    if (e.target.closest("#revOpen")) { $("#revF").hidden = false; $("#revF textarea").focus(); return; }
    const dl = e.target.closest("[data-dl-path]"); if (dl) { e.preventDefault(); const u = await DB.files.url(dl.dataset.dlBucket, dl.dataset.dlPath); if (u) window.open(u, "_blank"); else toast("다운로드 링크 생성 실패"); return; }
    const pd = e.target.closest("[data-paid]"); if (pd) { if (!confirm("송금을 완료하셨나요? 크리에이터에게 지급 완료 알림이 갑니다.")) return; const { error } = await DB.sb.from("payouts").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", pd.dataset.paid); if (error) return toast(error.message); const p = (st.payouts || []).find((x) => x.id === pd.dataset.paid); if (p) DB.notifs.push(p.creator_id, "nt_paid_out", { a: p.amount_php.toLocaleString() }, "#earn").catch(() => { }); await load(); toast("지급 완료 처리"); render(); return; }
    const po = e.target.closest("[data-payout]"); if (po) { const items = st.tasks.filter((t) => t.status === "done" && !t.paid_out && (t.creator_id || "?") === po.dataset.payout); if (LIVE) { const d = new Date(); const { data: pay, error } = await DB.sb.from("payouts").insert({ creator_id: po.dataset.payout, period_start: new Date(d.getFullYear(), d.getMonth(), d.getDate() < 15 ? 1 : 16).toISOString().slice(0, 10), period_end: d.toISOString().slice(0, 10), amount_php: +po.dataset.sum, status: "scheduled" }).select().single(); if (error) return toast(error.message); await DB.sb.from("payout_items").insert(items.map((t) => ({ payout_id: pay.id, task_id: t.id, amount_php: t.fee_php + (t.bonus_php || 0) }))); await DB.notifs.push(po.dataset.payout, "nt_pay", { a: (+po.dataset.sum).toLocaleString() }, "#earn"); await load(); } else items.forEach((t) => (t.paid_out = true)); toast("지급 건 생성: " + php(+po.dataset.sum)); render(); return; }
    if (e.target.closest("#gLogin")) { DB.auth.signInGoogle(location.href.split("#")[0]).catch((x) => toast(x.message)); return; }
  });
  document.addEventListener("change", async (e) => { const l = e.target.closest("[data-lvl]"); if (l) { const c = st.creators.find((x) => x.id === l.dataset.lvl); c.level = +l.value; if (LIVE) await DB.sb.from("profiles").update({ level: c.level }).eq("id", c.id); toast(c.name + " → Lv." + c.level); }
    const qs = e.target.closest("[data-qst]"); if (qs) { if (LIVE) { const { error } = await DB.sb.from("quote_requests").update({ status: qs.value }).eq("id", qs.dataset.qst); if (error) return toast(error.message); } const r = (st.quotes || []).find((x) => x.id === qs.dataset.qst); if (r) r.status = qs.value; toast("상태 변경"); render(); return; }
    if (e.target.matches('#taskF select[name="type"]')) { const f = e.target.form; if (f && f.fee && S.TYPES[e.target.value]) f.fee.value = S.TYPES[e.target.value].fee; } });
  document.addEventListener("submit", async (e) => {
    const f = e.target; e.preventDefault();
    if (f.id === "taskF") {
      const type = f.type.value, fee = +f.fee.value, cid = f.creator.value || null, lvl = cid ? (st.creators.find((c) => c.id === cid) || {}).level || 1 : 1, bonusPct = [0, 0, 10, 20, 30][lvl] || 0;
      const t = { order_id: f.dataset.order, type, client_alias: f.alias.value.trim() || "Client", brief: f.brief.value.trim(), files: f.files.value.split("\n").map((x) => x.trim()).filter(Boolean), refs: [], fee_php: fee, bonus_php: cid ? Math.round(fee * bonusPct / 100) : 0, min_level: +f.minLevel.value, max_rev: S.TYPES[type].maxRev, due_at: new Date(f.due.value).toISOString(), status: cid ? "offer" : "open", creator_id: cid, expires_at: cid ? new Date(Date.now() + 12 * H).toISOString() : null };
      if (!t.brief) { f.brief.focus(); return toast("브리프를 적어주세요"); }
      if (LIVE) { try {
          // 고객이 올린 원본 파일명이 줄에 있으면 7일짜리 서명 URL로 바꿔서 크리에이터가 받을 수 있게
          const ord = st.orders.find((x) => x.id === t.order_id), rf = ((ord && ord.requirements && ord.requirements.files) || []);
          t.files = await Promise.all(t.files.map(async (line) => { const m = rf.find((x) => x.name === line || x.path === line); if (!m) return line; const { data } = await DB.sb.storage.from(m.bucket || "sources").createSignedUrl(m.path, 7 * 24 * 3600); return data && data.signedUrl ? `${m.name} | ${data.signedUrl}` : line; }));
          const row = await DB.tasks.create(t); if (cid) await DB.threads.ensure("task", { task_id: row.id }, [cid]); const o = st.orders.find((x) => x.id === t.order_id); if (o && ["paid", "req"].includes(o.status)) await DB.orders.update(o.id, { status: "work", pm_id: DB.auth.user.id }); await load(); } catch (err) { return toast(err.message); } }
      else { st.tasks.unshift({ ...t, id: "T-new-" + Date.now(), task_no: "T-2611-0" + (430 + st.tasks.length), creator: cid ? st.creators.find((c) => c.id === cid) : null, rev: 0, created_at: new Date().toISOString() }); const o = st.orders.find((x) => x.id === t.order_id); if (o && ["paid", "req"].includes(o.status)) o.status = "work"; }
      toast(cid ? "작업을 제안했습니다 (12시간 내 수락)" : "오픈 보드에 올렸습니다"); render();
    } else if (f.id === "revF") { const notes = f.notes.value.trim(); if (!notes) return f.notes.focus(); await setTask(f.dataset.id, "revision", { rev_notes: notes }); if (LIVE) { const th = await DB.threads.ensure("task", { task_id: f.dataset.id }, []); DB.threads.send(th.id, notes, "en"); } }
    else if (f.id === "assignF") { const cid = f.creator.value || null; const t = st.tasks.find((x) => x.id === f.dataset.id); const patch = { creator_id: cid, status: cid ? "offer" : "open", expires_at: cid ? new Date(Date.now() + 12 * H).toISOString() : null }; if (LIVE) { await DB.tasks.update(t.id, patch); await load(); } else { Object.assign(t, patch, { creator: cid ? st.creators.find((c) => c.id === cid) : null }); } toast("배정 변경"); render(); }
    else if (f.id === "chatF") { const v = f.m.value.trim(); if (!v) return; f.m.value = ""; const b = $("#mbody"); b.innerHTML += `<div class="bub me"><div class="b">${esc(v)}</div><span class="t">${when(Date.now())}</span></div>`; b.scrollTop = b.scrollHeight; DB.threads.send(f.dataset.th, v, "ko").catch((x) => toast(x.message)); }
  });
  window.addEventListener("hashchange", render);

  if (LIVE) {
    DB.ready.then(() => {
      const boot = async (p) => { if (!p) return gate("PM 계정으로 로그인하세요."); if (!["pm", "admin"].includes(p.role)) return gate("이 계정은 PM 권한이 없습니다. (" + (p.email || "") + ") Supabase에서 role을 pm으로 바꿔주세요."); st.me = p; await load(); render(); DB.notifs.subscribe((n) => { st.notifs.unshift(n); chrome(); load().then(render); }); };
      DB.auth.onChange((p, ev) => { if (ev === "SIGNED_OUT") location.reload(); else boot(p); }); boot(DB.auth.user);
    });
  } else { load(); render(); }
})();
