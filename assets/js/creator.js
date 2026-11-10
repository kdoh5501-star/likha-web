/* LIKHA Creator Center — hash-routed SPA. State in localStorage ("likha-creator"). Demo only. */
(function () {
  const S = window.LIKHA_SEED, t = (k, v) => window.I18N.t(k, v);
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (n) => "₱" + Math.round(n).toLocaleString("en-PH");
  const H = 36e5, D = 864e5, KEY = "likha-creator";

  /* ---------- state ---------- */
  function fresh() {
    return {
      v: 3, tasks: JSON.parse(JSON.stringify(S.TASKS)), threads: JSON.parse(JSON.stringify(S.THREADS)), profile: JSON.parse(JSON.stringify(S.PROFILE)),
      payouts: S.PAYOUTS.slice(), academy: { w1: [true, true, true, true], w2: [true, true, true, true, true, true], test: [true, true] },
      notifs: [
        { id: 1, k: "nt_offer", v: { t: "T-2611-0412 · " + "Short-form" }, go: "#task/T-2611-0412", t: Date.now() - 2 * H, un: true },
        { id: 2, k: "nt_rev", v: { t: "T-2611-0370 · Subtitles" }, go: "#task/T-2611-0370", t: Date.now() - 20 * H, un: true },
        { id: 3, k: "nt_pass", v: { t: "T-2611-0366 · Short-form" }, go: "#task/T-2611-0366", t: Date.now() - D, un: false },
        { id: 4, k: "nt_pay", v: { a: "7,920" }, go: "#earn", t: Date.now() - 7 * D, un: false }
      ],
      read: { support: 1, "pm:yuna": 3, "pm:minho": 0, "task:T-2611-0398": 0, "task:T-2611-0370": 1 },
      settings: { n_offer: true, n_rev: true, n_pay: true, n_msg: true, n_email: false }
    };
  }
  let st; try { st = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
  if (!st || st.v !== 3) st = fresh();
  const LIVE = !!(window.DB && window.DB.live);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  /* ---------- LIVE: Supabase ↔ 화면 모델 ---------- */
  const ms = (x) => (x ? new Date(x).getTime() : undefined);
  function mapTask(r) {
    const pm = r.pm || {}; if (r.pm_id && !S.PMS[r.pm_id]) S.PMS[r.pm_id] = { name: pm.name || "PM", initials: (pm.name || "PM").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase() };
    return { id: r.id, no: r.task_no, type: r.type, status: r.status, client: r.client_alias, pm: r.pm_id, due: ms(r.due_at), expires: ms(r.expires_at), accepted: ms(r.accepted_at), deliveredAt: ms(r.delivered_at), passedAt: ms(r.passed_at), doneAt: ms(r.done_at),
      brief: r.brief, files: (r.files || []).map((f) => (typeof f === "string" ? f : f.name || f.path)), refs: (r.refs || []).map((f) => (typeof f === "string" ? f : f.name || f.path)), minLevel: r.min_level, base: r.fee_php, bonus: r.bonus_php, rev: r.rev, maxRev: r.max_rev, revNotes: r.rev_notes, link: r.deliverable && r.deliverable.link };
  }
  function mapMsg(m, me) { if (m.sender_id === me) return { from: "me", t: ms(m.created_at), text: m.text }; const tr = m.tr || {}; return { from: "pm", t: ms(m.created_at), ko: tr.ko || (m.lang === "ko" ? m.text : m.text), en: tr.en || (m.lang === "en" ? m.text : m.text), tl: tr.tl || tr.en || m.text }; }
  async function syncLive() {
    const me = DB.auth.user; if (!me) return;
    const p = st.profile; p.id = me.id; p.name = me.name || me.email; p.initials = (p.name || "?").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase(); p.city = me.city || ""; p.level = me.level || 1; p.deliveries = me.deliveries || 0; p.pass = me.first_pass || 0; p.ontime = me.ontime || 0; p.since = (me.created_at || "").slice(0, 7); p.skills = me.skills || []; p.tools = me.tools || []; p.capacity = me.capacity || 20; p.links = me.portfolio || []; const pa = me.payout_account || {}; p.payout = { method: me.payout_method || "gcash", gcash: pa.number || "", name: pa.name || "", bank: pa.bank || "", acct: pa.acct || "" };
    const [tasks, threads, notifs, payouts] = await Promise.all([DB.tasks.mine(), DB.threads.list(), DB.notifs.list(), DB.payouts.mine()]);
    st.tasks = tasks.map(mapTask);
    const th = {}; for (const t of threads) { const mine = (t.members || []).find((m) => m.user_id === me.id); const k = t.id; th[k] = { kind: t.kind === "order" ? "task" : t.kind, task: t.task_id, pm: null, msgs: [], lastRead: mine ? ms(mine.last_read_at) : 0, label: t.task ? t.task.task_no : "" }; }
    st.threads = th; st.threadsLoaded = true;
    st.notifs = notifs.map((n) => ({ id: n.id, k: n.kind, v: n.vars || {}, go: n.link, t: ms(n.created_at), un: !n.read }));
    st.payouts = payouts.map((x) => ({ date: x.period_end, amount: x.amount_php, method: (x.method || "").toUpperCase(), status: x.status }));
  }
  async function loadThreadLive(k) {
    const th = st.threads[k]; if (!th) return; const me = DB.auth.user.id; const rows = await DB.threads.messages(k);
    th.msgs = rows.map((m) => mapMsg(m, me)); const pmMsg = rows.find((m) => m.sender_id !== me); if (pmMsg && pmMsg.sender) { th.pm = pmMsg.sender_id; if (!S.PMS[th.pm]) S.PMS[th.pm] = { name: pmMsg.sender.name || "PM", initials: (pmMsg.sender.name || "PM").slice(0, 2).toUpperCase() }; }
    st.read[k] = th.msgs.filter((m) => m.from === "pm").length; await DB.threads.markRead(k);
  }

  const task = (id) => st.tasks.find((x) => x.id === id);
  const typ = (tp) => S.TYPES[tp];
  const tname = (tp) => t(typ(tp).key);
  const lvl = () => S.LEVELS[st.profile.level - 1];
  const nextLvl = () => S.LEVELS[st.profile.level] || null;
  const feeOf = (tk) => { const b = tk.base || typ(tk.type).fee; return { base: b, bonus: tk.bonus != null && LIVE ? tk.bonus : Math.round(b * lvl().bonus / 100) }; };

  function toast(m) { const e = $("#toast"); e.textContent = m; e.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(() => e.classList.remove("on"), 2400); }
  function notify(k, v, go) { st.notifs.unshift({ id: Date.now(), k, v, go, t: Date.now(), un: true }); save(); renderBell(); }
  const unreadMsgs = () => LIVE && !st.threadsLoaded ? 0 : Object.keys(st.threads).reduce((n, k) => n + Math.max(0, st.threads[k].msgs.filter((m) => m.from === "pm").length - (st.read[k] || 0)), 0);
  const unreadNotifs = () => st.notifs.filter((n) => n.un).length;

  /* ---------- time helpers ---------- */
  function dueLabel(ms) {
    const d = ms - Date.now();
    if (d < 0) return `<span class="due late">${t("overdue")} · ${Math.round(-d / H)}${t("hours")}</span>`;
    if (d < D) return `<span class="due soon">${t("due")} ${Math.round(d / H)}${t("hours")}</span>`;
    return `<span class="due">${t("due")} ${Math.round(d / D)}${t("days")}</span>`;
  }
  const when = (ms) => { const d = new Date(ms); return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }); };
  const dateS = (ms) => new Date(ms).toISOString().slice(0, 10);
  function nextPayoutDate() { const d = new Date(); const day = d.getDate(); const n = new Date(d); if (day < 15) n.setDate(15); else { n.setMonth(n.getMonth() + (day >= 30 ? 1 : 0)); n.setDate(day >= 30 ? 15 : 30); } return n; }

  /* ---------- icons ---------- */
  const I = {
    dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    board: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16"/></svg>',
    tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    msgs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    earn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>',
    profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    academy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>'
  };

  /* ---------- chrome ---------- */
  const NAV = [["dash", "nav_dash", I.dash], ["board", "nav_board", I.board], ["tasks", "nav_tasks", I.tasks], ["msgs", "nav_msgs", I.msgs], ["earn", "nav_earn", I.earn], ["profile", "nav_profile", I.profile], ["academy", "nav_academy", I.academy], ["settings", "nav_settings", I.settings]];
  function renderChrome() {
    const cur = (location.hash.slice(1) || "dash").split("/")[0];
    const counts = { board: st.tasks.filter((x) => x.status === "offer").length, msgs: unreadMsgs(), tasks: st.tasks.filter((x) => x.status === "revision").length };
    const on = (k) => (k === cur || (k === "tasks" && cur === "task") ? " on" : "");
    const nxt = nextLvl(), prog = nxt ? Math.min(100, Math.round(st.profile.deliveries / nxt.need * 100)) : 100;
    $("#side").innerHTML = NAV.map(([k, lk, ic]) => `<a href="#${k}" class="${on(k)}">${ic}${t(lk)}${counts[k] ? `<span class="n">${counts[k]}</span>` : ""}</a>`).join("") +
      (LIVE && !DB.auth.user ? "" : `<div class="card-lv"><span>${t("level")}</span><b>Lv.${st.profile.level} · +${lvl().bonus}%</b>${nxt ? `<span>${t("level_progress")}: ${st.profile.deliveries}/${nxt.need} ${t("deliveries")}</span><div class="bar"><i style="width:${prog}%"></i></div>` : ""}</div>`) +
      `<div class="sec" style="margin-top:14px">LIKHA</div><a href="index.html">${I.back}${t("back_site")}</a>`;
    $("#tab").innerHTML = [["dash", "nav_dash", I.dash], ["board", "nav_board", I.board], ["tasks", "nav_tasks", I.tasks], ["msgs", "nav_msgs", I.msgs], ["earn", "nav_earn", I.earn]].map(([k, lk, ic]) => `<a href="#${k}" class="${on(k)}">${ic}${t(lk)}${counts[k] ? `<span class="n">${counts[k]}</span>` : ""}</a>`).join("");
    $("#langsw").innerHTML = window.I18N.langs.map(([c, n]) => `<button type="button" data-lang="${c}" class="${c === window.I18N.lang ? "on" : ""}" aria-pressed="${c === window.I18N.lang}">${c.toUpperCase()}</button>`).join("");
    $("#avatar").textContent = st.profile.initials; $("#hdrLvl").textContent = "Lv." + st.profile.level;
    $$("[data-i18n]").forEach((e) => (e.textContent = t(e.dataset.i18n)));
    renderBell();
  }
  function renderBell() {
    const n = unreadNotifs(); const d = $("#bellDot"); d.hidden = !n; d.textContent = n;
    $("#ndrop").innerHTML = `<div class="hd"><span>${t("notif")}</span><button type="button" id="readAll">${t("mark_read")}</button></div>` +
      (st.notifs.length ? `<ul>${st.notifs.slice(0, 12).map((x) => `<li class="${x.un ? "un" : ""}" data-go="${x.go}" data-id="${x.id}"><i></i><div>${esc(t(x.k, x.v))}<span>${when(x.t)}</span></div></li>`).join("")}</ul>` : `<div class="empty">${t("notif_empty")}</div>`);
  }

  /* ---------- views ---------- */
  const tcard = (tk, acts) => {
    const f = feeOf(tk), lvlReq = tk.minLevel && tk.minLevel > st.profile.level;
    return `<article class="tcard" data-task="${tk.id}">
      <div><div class="top"><span class="ty">${tname(tk.type)}</span><span class="st ${tk.status}">${t("s_" + tk.status)}</span><span class="id">${tk.no || tk.id}</span></div>
        <div class="ttl">${esc(tk.client)}</div>
        <div class="meta"><span>${t("pm")}: <b>${(S.PMS[tk.pm] || { name: "PM" }).name}</b></span><span>${t("est_time")}: <b>${typ(tk.type).est}</b></span>${tk.minLevel ? `<span>${t("level_req", { n: tk.minLevel })}</span>` : ""}</div></div>
      <div class="right"><div class="fee">${fmt(f.base + f.bonus)}</div>${tk.status === "offer" ? `<span class="due soon">${t("expires_in", { h: Math.max(1, Math.round((tk.expires - Date.now()) / H)) })}</span>` : dueLabel(tk.due)}
        ${acts ? `<div class="acts">${lvlReq ? `<span class="sm muted">${t("locked", { n: tk.minLevel })}</span>` : acts}</div>` : ""}</div></article>`;
  };
  const offerActs = (id) => `<button class="btn btn-line" data-act="decline" data-id="${id}">${t("decline")}</button><button class="btn btn-accent" data-act="accept" data-id="${id}">${t("accept")}</button>`;
  const openActs = (id) => `<button class="btn btn-brand" data-act="claim" data-id="${id}">${t("claim")}</button>`;

  function vDash() {
    const offers = st.tasks.filter((x) => x.status === "offer"), active = st.tasks.filter((x) => x.status === "work" || x.status === "revision"), review = st.tasks.filter((x) => x.status === "review" || x.status === "delivered");
    const pend = st.tasks.filter((x) => x.status === "done").reduce((a, x) => a + x.base + x.bonus, 0) + st.tasks.filter((x) => x.status === "delivered").reduce((a, x) => a + feeOf(x).base + feeOf(x).bonus, 0);
    const month = st.tasks.filter((x) => x.status === "done" && dateS(x.doneAt).slice(0, 7) === dateS(Date.now()).slice(0, 7)).reduce((a, x) => a + x.base + x.bonus, 0);
    const today = st.tasks.filter((x) => ["work", "revision"].includes(x.status) && x.due - Date.now() < D);
    return `<div class="ph"><div><h1>${t("hello", { name: st.profile.name.split(" ")[0] })}</h1><p>${t("dash_sub")}</p></div></div><p class="demo-note">${t("demo")}</p>
      <div class="kpis"><div class="kpi"><span>${t("k_active")}</span><b>${active.length}</b></div><div class="kpi"><span>${t("k_review")}</span><b>${review.length}</b></div><div class="kpi"><span>${t("k_offers")}</span><b>${offers.length}</b></div><div class="kpi hi"><span>${t("k_pending")} · ${nextPayoutDate().toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><b>${fmt(pend)}</b></div></div>
      <div class="g2"><div>
        <div class="panel"><h3>${t("offers_title")}<a href="#board">${t("see_all")}</a></h3><p class="sub">${t("offers_sub", { h: 12 })}</p>
          ${offers.length ? `<div class="tlist">${offers.map((x) => tcard(x, offerActs(x.id))).join("")}</div>` : `<div class="empty">${t("no_offers")}</div>`}</div>
        <div class="panel" style="margin-top:14px"><h3>${t("today_title")}<a href="#tasks">${t("see_all")}</a></h3>
          ${today.length ? `<div class="tlist">${today.map((x) => tcard(x)).join("")}</div>` : `<div class="empty">${t("nothing_due")}</div>`}</div>
      </div><div>
        <div class="panel"><h3>${t("k_month")}</h3><b style="font-size:30px;font-weight:800">${fmt(month)}</b><p class="sub" style="margin-top:6px">${t("payout_sched")}</p>
          <dl class="kv" style="margin-top:10px"><dt>${t("k_pass")}</dt><dd>${st.profile.pass}%</dd><dt>${t("st_ontime")}</dt><dd>${st.profile.ontime}%</dd><dt>${t("st_deliv")}</dt><dd>${st.profile.deliveries}</dd></dl></div>
        <div class="panel" style="margin-top:14px"><h3>${t("nav_msgs")}<a href="#msgs">${t("see_all")}</a></h3>${threadList(true)}</div>
      </div></div>`;
  }

  function vBoard(tab) {
    tab = tab || "offers";
    const offers = st.tasks.filter((x) => x.status === "offer"), open = st.tasks.filter((x) => x.status === "open");
    return `<div class="ph"><div><h1>${t("board_title")}</h1><p>${t("board_sub")}</p></div></div>
      <div class="tabs"><button data-tab="offers" class="${tab === "offers" ? "on" : ""}">${t("tab_offers")}<span class="n">${offers.length}</span></button><button data-tab="open" class="${tab === "open" ? "on" : ""}">${t("tab_open")}<span class="n">${open.length}</span></button></div>
      ${tab === "offers" ? (offers.length ? `<div class="tlist">${offers.map((x) => tcard(x, offerActs(x.id))).join("")}</div>` : `<div class="empty">${t("no_offers")}</div>`) : (open.length ? `<div class="tlist">${open.map((x) => tcard(x, openActs(x.id))).join("")}</div>` : `<div class="empty">${t("no_open")}</div>`)}`;
  }

  function vTasks(f) {
    f = f || "active";
    const sets = { active: ["work"], review: ["review", "delivered"], revision: ["revision"], done: ["done"] };
    const list = st.tasks.filter((x) => sets[f].includes(x.status)).sort((a, b) => a.due - b.due);
    const cnt = (k) => st.tasks.filter((x) => sets[k].includes(x.status)).length;
    return `<div class="ph"><div><h1>${t("tasks_title")}</h1></div></div>
      <div class="tabs">${["active", "review", "revision", "done"].map((k) => `<button data-tab="${k}" class="${f === k ? "on" : ""}">${t("f_" + k)}<span class="n">${cnt(k)}</span></button>`).join("")}</div>
      ${list.length ? `<div class="tlist">${list.map((x) => tcard(x)).join("")}</div>` : `<div class="empty">${t("no_tasks")}</div>`}`;
  }

  function vTask(id) {
    const tk = task(id); if (!tk) return `<div class="empty">${t("no_tasks")}</div>`;
    const f = feeOf(tk), tp = typ(tk.type), ck = S.CHECKLIST[tk.type] || [], max = tk.maxRev || tp.maxRev, rev = tk.rev || 0;
    const canDeliver = tk.status === "work" || tk.status === "revision";
    const steps = [["accepted", tk.accepted], ["deliveredAt", tk.deliveredAt], ["passedAt", tk.passedAt], ["doneAt", tk.doneAt]];
    const stepL = { accepted: t("s_work"), deliveredAt: t("s_review"), passedAt: t("s_delivered"), doneAt: t("s_done") };
    return `<div class="ph"><div><a href="#tasks" class="link">${I.back} ${t("nav_tasks")}</a><h1 style="margin-top:6px">${tname(tk.type)} · ${esc(tk.client)}</h1><p><span class="id" style="font-family:ui-monospace,monospace">${tk.no || tk.id}</span> · <span class="st ${tk.status}">${t("s_" + tk.status)}</span> · ${dueLabel(tk.due)}</p></div>
        <div style="display:flex;gap:8px">${tk.status === "offer" ? offerActs(tk.id) : tk.status === "open" ? openActs(tk.id) : ""}<a class="btn btn-line" href="#msgs/task:${tk.id}">${t("open_chat")}</a></div></div>
      <div class="tdet"><div>
        ${tk.status === "revision" ? `<div class="panel"><h3>${t("revision_from_pm")} <span class="sm muted">${t("rev_count", { n: rev, max })}</span></h3><div class="revbox">${esc(tk.revNotes)}</div><p class="sub" style="margin:10px 0 0">${t("rev_extra")}</p></div>` : ""}
        <div class="panel"><h3>${t("brief")}</h3><p class="sub">${t("brief_note")}</p><div class="brief">${esc(tk.brief)}</div></div>
        <div class="panel"><h3>${t("files")}</h3>${tk.files.length ? `<ul class="flist">${tk.files.map((x) => { const m = /^(.*?)\s*\|\s*(https?:\/\/\S+)$/.exec(x); const name = m ? m[1] : x, url = m ? m[2] : (/^https?:\/\//.test(x) ? x : null); return url ? `<li><a href="${esc(url)}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">${I.file}<span style="overflow-wrap:anywhere">${esc(name)}</span></a><span class="dl">↓</span></li>` : `<li>${I.file}${esc(name)}</li>`; }).join("")}</ul>` : `<span class="muted">—</span>`}
          ${tk.refs.length ? `<h3 style="margin-top:16px">${t("refs")}</h3><ul class="flist">${tk.refs.map((x) => `<li>${I.file}${esc(x)}<span class="dl">↓</span></li>`).join("")}</ul>` : ""}</div>
        <div class="panel"><h3>${t("specs")}</h3><div class="brief" style="font-size:14px">${esc(tp.specs)}</div></div>
      </div><div class="sticky-act">
        <div class="panel"><dl class="kv"><dt>${t("fee")}</dt><dd>${fmt(f.base)}</dd><dt>${t("bonus")} +${lvl().bonus}%</dt><dd>${fmt(f.bonus)}</dd><dt><b>${t("col_total")}</b></dt><dd><b style="font-size:18px">${fmt(f.base + f.bonus)}</b></dd><dt>${t("pm")}</dt><dd>${(S.PMS[tk.pm] || { name: "PM" }).name}</dd><dt>${t("est_time")}</dt><dd>${tp.est}</dd></dl></div>
        ${canDeliver ? `<div class="panel"><h3>${tk.status === "revision" ? t("resubmit") : t("deliver")}</h3>
          <div class="chk" id="chk">${ck.map((c, i) => `<label><input type="checkbox" data-i="${i}">${esc(c)}</label>`).join("")}</div>
          <form id="deliverF" style="margin-top:12px"><div class="fld"><label>${t("deliver_link")}</label><input name="link" placeholder="https://drive.google.com/…" value="${tk.status === "revision" && tk.link ? esc(tk.link.replace(/v\d+/, "v" + (rev + 1))) : ""}"></div><div class="fld"><label>${t("deliver_note")}</label><textarea name="note"></textarea></div><button class="btn btn-accent" style="width:100%">${tk.status === "revision" ? t("resubmit") : t("deliver")}</button></form></div>` : ""}
        ${tk.status === "done" ? `<div class="panel"><h3>${t("credited")}</h3><div class="kv"><dt>${t("col_date")}</dt><dd>${dateS(tk.doneAt)}</dd><dt>${t("col_total")}</dt><dd><b>${fmt(tk.base + tk.bonus)}</b></dd></div></div>` : ""}
        <div class="panel"><h3>${t("timeline")}</h3><ul class="tl">${steps.map(([k, v]) => `<li class="${v ? "on" : ""}"><div>${stepL[k]}${v ? `<span>${when(v)}</span>` : ""}</div></li>`).join("")}</ul></div>
      </div></div>`;
  }

  /* ---------- messages ---------- */
  function threadMeta(k) {
    const th = st.threads[k], last = th.msgs[th.msgs.length - 1];
    const un = Math.max(0, th.msgs.filter((m) => m.from === "pm").length - (st.read[k] || 0));
    let name, av, cls = "";
    if (th.kind === "support") { name = t("th_support"); av = "LK"; cls = "sup"; }
    else if (th.kind === "pm") { name = (S.PMS[th.pm] || { name: "LIKHA" }).name + " · " + t("th_pm"); av = (S.PMS[th.pm] || { initials: "PM" }).initials; }
    else { const tk = task(th.task); name = (tk ? tname(tk.type) + " · " + tk.client : (th.label || th.task || "Task")); av = (S.PMS[th.pm] || { initials: "PM" }).initials; }
    const pv = last ? (last.from === "me" ? last.text : (last[window.I18N.lang] || last.en)) : "";
    return { name, av, cls, un, pv, last };
  }
  function threadList(compact) {
    const keys = Object.keys(st.threads).sort((a, b) => { const la = st.threads[a].msgs.slice(-1)[0], lb = st.threads[b].msgs.slice(-1)[0]; return (lb ? lb.t : 0) - (la ? la.t : 0); });
    const cur = (location.hash.split("/")[1] || "");
    const rows = (compact ? keys.slice(0, 3) : keys).map((k) => { const m = threadMeta(k); return `<a href="#msgs/${k}" class="${k === cur ? "on" : ""}"><span class="av ${m.cls}">${m.av}</span><div><div class="nm">${esc(m.name)}</div><div class="pv">${esc(m.pv)}</div></div>${m.un ? `<span class="un">${m.un}</span>` : ""}</a>`; }).join("");
    return compact ? `<div class="thl compact">${rows}</div>` : rows;
  }
  function vMsgs(k) {
    const has = k && st.threads[k];
    if (has && LIVE && !st.threads[k].loaded) { st.threads[k].loaded = true; loadThreadLive(k).then(() => { if (location.hash === "#msgs/" + k) render(); }); }
    if (has) { st.read[k] = st.threads[k].msgs.filter((m) => m.from === "pm").length; save(); }
    const body = has ? threadBody(k) : `<div class="nothread">${t("msgs_title")}</div>`;
    return `<div class="ph"><div><h1>${t("msgs_title")}</h1></div></div>
      <div class="msgs ${has ? "mobile-td" : "mobile-th"}"><div class="thl"><div class="sec">${t("nav_msgs")}</div>${threadList(false)}</div><div class="thd" id="thd">${body}</div></div>`;
  }
  function threadBody(k) {
    const th = st.threads[k], m = threadMeta(k), L = window.I18N.lang;
    const bub = (x, i) => x.from === "me" ? `<div class="bub me"><div class="b">${esc(x.text)}</div><span class="t">${when(x.t)}</span></div>`
      : `<div class="bub"><div class="b">${esc(x[L] || x.en)}</div><span class="t">${when(x.t)} · ${t("auto_tr")} · <button class="tr" data-orig="${i}">${t("show_orig")}</button></span><div class="orig" data-oi="${i}" hidden>${esc(x.ko)}</div></div>`;
    return `<div class="hd"><button class="ibtn backth" data-back aria-label="Back">${I.back}</button><span class="av ${m.cls}" style="width:34px;height:34px;border-radius:50%;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:800;font-size:12px">${m.av}</span><div><b>${esc(m.name)}</b><br><span>${th.kind === "support" ? "LIKHA" : t("pm_online")}</span></div>${th.kind === "task" ? `<a class="btn btn-line" style="margin-left:auto;height:34px;font-size:13px" href="#task/${th.task}">${t("view")}</a>` : ""}</div>
      <div class="trn">${t("tr_note")}</div>
      <div class="body" id="mbody">${th.msgs.map(bub).join("")}</div>
      <div class="qq"><span class="sm muted" style="align-self:center;white-space:nowrap">${t("quick_q")}:</span>${["qq1", "qq2", "qq3"].map((q) => `<button type="button" data-qq="${q}">${t(q)}</button>`).join("")}</div>
      <form id="chatF" data-th="${k}"><input name="m" autocomplete="off" placeholder="${t("type_msg")}" aria-label="${t("type_msg")}"><button class="btn btn-brand">${t("send")}</button></form>`;
  }
  function sendMsg(k, text) {
    const th = st.threads[k];
    if (LIVE) { th.msgs.push({ from: "me", t: Date.now(), text }); render(); const b = $("#mbody"); if (b) b.scrollTop = b.scrollHeight; DB.threads.send(k, text, window.I18N.lang).catch((e) => toast(e.message)); return; } th.msgs.push({ from: "me", t: Date.now(), text }); save();
    const body = $("#mbody"); if (body) { body.innerHTML += `<div class="bub me"><div class="b">${esc(text)}</div><span class="t">${when(Date.now())}</span></div><div class="bub typing" id="typing"><div class="b">${t("pm_typing")}</div></div>`; body.scrollTop = body.scrollHeight; }
    const lo = text.toLowerCase(); const key = /link|open|access|permission|bukas/.test(lo) ? "link" : /ref|style|sample|example|reference/.test(lo) ? "ref" : /extend|extension|deadline|more time|araw/.test(lo) ? "ext" : /thank|salamat|ok|got it|noted/.test(lo) ? "thanks" : "default";
    setTimeout(() => {
      const r = S.PM_REPLIES[key]; th.msgs.push({ from: "pm", t: Date.now(), ko: r.ko, en: r.en, tl: r.tl });
      if (key === "ext" && th.kind === "task") { const tk = task(th.task); if (tk) tk.due += D; }
      if (location.hash === "#msgs/" + k) { st.read[k] = th.msgs.filter((m) => m.from === "pm").length; save(); render(); const b = $("#mbody"); if (b) b.scrollTop = b.scrollHeight; }
      else { save(); if (st.settings.n_msg) notify("nt_msg", { t: r[window.I18N.lang].slice(0, 40) + "…" }, "#msgs/" + k); renderChrome(); }
    }, 1400);
  }

  /* ---------- earnings ---------- */
  function vEarn() {
    const done = st.tasks.filter((x) => x.status === "done").sort((a, b) => b.doneAt - a.doneAt);
    const pend = done.reduce((a, x) => a + x.base + x.bonus, 0), paidTot = st.payouts.filter((x) => !x.status || x.status === "paid").reduce((a, x) => a + x.amount, 0);
    const month = done.filter((x) => dateS(x.doneAt).slice(0, 7) === dateS(Date.now()).slice(0, 7)).reduce((a, x) => a + x.base + x.bonus, 0);
    const p = st.profile.payout;
    return `<div class="ph"><div><h1>${t("earn_title")}</h1><p>${t("payout_sched")}</p></div></div>
      <div class="kpis"><div class="kpi hi"><span>${t("e_available")}</span><b>${fmt(pend)}</b></div><div class="kpi"><span>${t("e_next")}</span><b>${nextPayoutDate().toLocaleDateString(undefined, { month: "short", day: "numeric" })}</b></div><div class="kpi"><span>${t("e_month")}</span><b>${fmt(month)}</b></div><div class="kpi"><span>${t("e_paid")}</span><b>${fmt(paidTot)}</b></div></div>
      <div class="g2"><div>
        <div class="panel led"><h3>${t("ledger")}</h3><span class="scrollhint">← swipe →</span><table><thead><tr><th>${t("col_date")}</th><th>${t("col_task")}</th><th class="n">${t("col_base")}</th><th class="n">${t("col_bonus")}</th><th class="n">${t("col_total")}</th><th>${t("col_status")}</th></tr></thead><tbody>
          ${done.map((x) => `<tr><td>${dateS(x.doneAt)}</td><td><a href="#task/${x.id}" class="link">${tname(x.type)}</a><br><span class="sm muted">${esc(x.client)}</span></td><td class="n">${fmt(x.base)}</td><td class="n">+${fmt(x.bonus)}</td><td class="n"><b>${fmt(x.base + x.bonus)}</b></td><td><span class="st done">${t("scheduled")}</span></td></tr>`).join("")}
        </tbody></table></div>
        <div class="panel led" style="margin-top:14px"><h3>${t("payouts")}</h3><span class="scrollhint">← swipe →</span><table><thead><tr><th>${t("col_date")}</th><th>${t("method")}</th><th class="n">${t("col_total")}</th><th>${t("col_status")}</th></tr></thead><tbody>
          ${st.payouts.map((x) => `<tr><td>${x.date}</td><td>${x.method}</td><td class="n"><b>${fmt(x.amount)}</b></td><td><span class="st ${x.status === "paid" || !x.status ? "done" : "work"}">${x.status === "paid" || !x.status ? t("paid") : t("scheduled")}</span></td></tr>`).join("")}</tbody></table></div>
      </div><div>
        <div class="panel"><h3>${t("method")}</h3><form id="payF"><div class="radio" style="margin-bottom:14px">${[["gcash", "GCash"], ["maya", "Maya"], ["bank", t("bank")]].map(([v, l]) => `<label class="${p.method === v ? "on" : ""}"><input type="radio" name="method" value="${v}" ${p.method === v ? "checked" : ""} hidden>${l}</label>`).join("")}</div>
          <div id="payFields">${payFields(p.method, p)}</div><button class="btn btn-dark" style="width:100%">${t("save")}</button></form><p class="sub" style="margin:12px 0 0">${t("method_note")}</p><p class="sub" style="margin:6px 0 0">${t("tax_note")}</p></div>
      </div></div>`;
  }
  const payFields = (m, p) => m === "bank" ? `<div class="fld"><label>${t("bank")}</label><input name="bank" value="${esc(p.bank)}" placeholder="BDO / BPI / UnionBank"></div><div class="fld"><label>${t("acct_no")}</label><input name="acct" value="${esc(p.acct)}"></div><div class="fld"><label>${t("acct_name")}</label><input name="name" value="${esc(p.name)}"></div>`
    : `<div class="fld"><label>${m === "gcash" ? t("gcash_no") : "Maya"}</label><input name="gcash" value="${esc(p.gcash)}" placeholder="09xx xxx xxxx"></div><div class="fld"><label>${t("acct_name")}</label><input name="name" value="${esc(p.name)}"></div>`;

  /* ---------- profile ---------- */
  function vProfile() {
    const p = st.profile;
    return `<div class="ph"><div><h1>${t("prof_title")}</h1><p>${t("prof_sub")}</p></div></div>
      <div class="g2"><div><form id="profF" class="panel">
        <div class="fld"><label>${t("display_name")}</label><input name="name" value="${esc(p.name)}"></div>
        <div class="fld"><label>${t("city")}</label><input name="city" value="${esc(p.city)}"></div>
        <div class="fld"><label>${t("skills")}</label><div class="chips">${Object.keys(S.TYPES).map((k) => `<button type="button" class="chip ${p.skills.includes(k) ? "on" : ""}" data-skill="${k}">${t(S.TYPES[k].key)}</button>`).join("")}</div></div>
        <div class="fld"><label>${t("tools")}</label><div class="chips">${["CapCut", "Premiere Pro", "DaVinci", "After Effects", "Photoshop", "Figma", "Higgsfield", "Runway"].map((k) => `<button type="button" class="chip ${p.tools.includes(k) ? "on" : ""}" data-tool="${k}">${k}</button>`).join("")}</div></div>
        <div class="fld"><label>${t("portfolio")}</label>${p.links.map((l, i) => `<input name="link${i}" value="${esc(l)}" style="margin-bottom:6px">`).join("")}<input name="link${p.links.length}" placeholder="https://"><span class="sm muted">${t("add_link")}</span></div>
        <div class="fld"><label>${t("avail")} <span class="muted" style="font-weight:500">· ${t("avail_note")}</span></label><div style="display:flex;align-items:center;gap:10px"><input type="range" name="capacity" min="5" max="60" step="5" value="${p.capacity}" style="flex:1"><b id="capV">${p.capacity} ${t("per_week")}</b></div></div>
        <button class="btn btn-dark">${t("save")}</button></form></div>
      <div><div class="panel"><h3>${t("stats")}</h3><dl class="kv"><dt>${t("level")}</dt><dd>Lv.${p.level} · +${lvl().bonus}%</dd><dt>${t("st_deliv")}</dt><dd>${p.deliveries}</dd><dt>${t("st_pass")}</dt><dd>${p.pass}%</dd><dt>${t("st_ontime")}</dt><dd>${p.ontime}%</dd><dt>${t("st_since")}</dt><dd>${p.since}</dd></dl></div>
        <div class="panel" style="margin-top:14px"><h3>${t("level_rules")}</h3><table class="lvtab">${S.LEVELS.map((l) => `<tr class="${l.n === p.level ? "cur" : ""}"><td>Lv.${l.n}</td><td>${t("lv" + l.n)}</td><td class="b">+${l.bonus}%</td></tr>`).join("")}</table></div></div></div>`;
  }

  /* ---------- academy ---------- */
  function vAcademy() {
    const tot = S.ACADEMY.reduce((a, m) => a + m.lessons.length, 0), doneN = S.ACADEMY.reduce((a, m) => a + st.academy[m.id].filter(Boolean).length, 0);
    return `<div class="ph"><div><h1>${t("ac_title")}</h1><p>${t("ac_sub")}</p></div><div class="kpi" style="min-width:180px"><span>${t("ac_progress")}</span><b>${Math.round(doneN / tot * 100)}%</b></div></div>
      <div class="g2"><div>${S.ACADEMY.map((m) => { const d = st.academy[m.id], n = d.filter(Boolean).length; return `<div class="mod" data-mod="${m.id}"><h3>${t(m.key)}<span class="sm muted">${n}/${m.lessons.length}${n === m.lessons.length ? " · " + t("ac_done") : ""}</span></h3><div class="prog"><i style="width:${n / m.lessons.length * 100}%"></i></div><ul>${m.lessons.map((l, i) => `<li class="${d[i] ? "done" : ""}"><input type="checkbox" data-les="${i}" ${d[i] ? "checked" : ""}>${esc(l)}</li>`).join("")}</ul></div>`; }).join("")}</div>
      <div><div class="panel"><h3>Resources</h3><ul class="flist"><li>${I.file}${t("ac_style")}<span class="dl">↓</span></li><li>${I.file}${t("ac_templates")}<span class="dl">↓</span></li><li>${I.file}${t("ac_fonts")}<span class="dl">↓</span></li></ul></div></div></div>`;
  }

  /* ---------- settings ---------- */
  function vSettings() {
    const theme = document.documentElement.getAttribute("data-theme") || "sys";
    return `<div class="ph"><div><h1>${t("set_title")}</h1></div></div>
      <div class="g2"><div>
        <div class="panel"><h3>${t("set_lang")}</h3><div class="radio">${window.I18N.langs.map(([c, n]) => `<label class="${c === window.I18N.lang ? "on" : ""}"><input type="radio" name="lang" value="${c}" hidden ${c === window.I18N.lang ? "checked" : ""}>${n}</label>`).join("")}</div></div>
        <div class="panel" style="margin-top:14px"><h3>${t("set_notif")}</h3><div class="chk">${["n_offer", "n_rev", "n_pay", "n_msg", "n_email"].map((k) => `<label><input type="checkbox" data-set="${k}" ${st.settings[k] ? "checked" : ""}>${t(k)}</label>`).join("")}</div></div>
        <div class="panel" style="margin-top:14px"><h3>${t("set_theme")}</h3><div class="radio">${[["sys", t("th_sys")], ["light", t("th_light")], ["dark", t("th_dark")]].map(([v, l]) => `<label class="${theme === v ? "on" : ""}"><input type="radio" name="theme" value="${v}" hidden ${theme === v ? "checked" : ""}>${l}</label>`).join("")}</div></div>
      </div><div>
        <div class="panel"><a class="btn btn-line" style="width:100%" href="index.html#legal/terms">${t("set_contract")}</a><button class="btn btn-ghost" style="width:100%;margin-top:8px;color:var(--danger)" id="resetDemo">${LIVE ? "Log out" : t("set_reset")}</button></div>
      </div></div>`;
  }

  /* ---------- router ---------- */
  function render() {
    const parts = (location.hash.slice(1) || "dash").split("/"), v = parts[0]; let a = parts.slice(1).join("/");
    if (v === "msgs" && a.startsWith("task:") && !st.threads[a]) {
      const tid = a.slice(5), k = Object.keys(st.threads).find((x) => st.threads[x].task === tid);
      if (k) { location.replace("#msgs/" + k); return; }
      if (LIVE) { const tk = st.tasks.find((x) => x.id === tid); if (tk) { DB.threads.ensure("task", { task_id: tid }, [DB.auth.user.id, tk.pm].filter(Boolean)).then(() => syncLive()).then(() => render()).catch(() => { }); } }
    }
    let html;
    if (v === "board") html = vBoard(a); else if (v === "tasks") html = vTasks(a); else if (v === "task") html = vTask(a);
    else if (v === "msgs") html = vMsgs(a); else if (v === "earn") html = vEarn(); else if (v === "profile") html = vProfile();
    else if (v === "academy") html = vAcademy(); else if (v === "settings") html = vSettings(); else html = vDash();
    $("#main").innerHTML = html; renderChrome();
    const b = $("#mbody"); if (b) b.scrollTop = b.scrollHeight;
    if (!(v === "msgs" && a)) window.scrollTo(0, 0);
  }

  /* ---------- actions ---------- */
  async function act(kind, id) {
    const tk = task(id); if (!tk) return;
    if (LIVE) { try { if (kind === "decline") { await DB.tasks.decline(id); toast(t("declined_msg")); } else { await DB.tasks.accept(id); toast(t("accepted_msg")); } await syncLive(); if (kind !== "decline") location.hash = "#task/" + id; render(); } catch (e) { toast(e.message); } return; }
    if (kind === "accept" || kind === "claim") { tk.status = "work"; tk.accepted = Date.now(); delete tk.expires; st.threads["task:" + id] = st.threads["task:" + id] || { kind: "task", task: id, pm: tk.pm, msgs: [] }; save(); toast(t("accepted_msg")); if (location.hash === "#task/" + id) render(); else location.hash = "#task/" + id; }
    else if (kind === "decline") { tk.status = "declined"; save(); toast(t("declined_msg")); render(); }
  }
  function deliver(id, link, note) {
    const tk = task(id), boxes = $$("#chk input"); if (!link) return toast(t("need_link"));
    if (boxes.length && !boxes.every((b) => b.checked)) return toast(t("need_check"));
    if (LIVE) { DB.tasks.deliver(id, link, note, tk.status === "revision").then(async () => { const k = Object.keys(st.threads).find((x) => st.threads[x].task === id); if (k) await DB.threads.send(k, (tk.status === "revision" ? "Revision submitted: " : "Delivered: ") + link + (note ? "\n" + note : ""), "en"); await syncLive(); toast(t("delivered_msg")); render(); }).catch((e) => toast(e.message)); return; }
    if (tk.status === "revision") tk.rev = (tk.rev || 0);
    tk.status = "review"; tk.deliveredAt = Date.now(); tk.link = link;
    const k = "task:" + id; st.threads[k] = st.threads[k] || { kind: "task", task: id, pm: tk.pm, msgs: [] };
    st.threads[k].msgs.push({ from: "me", t: Date.now(), text: (tk.rev ? "Revision submitted: " : "Delivered: ") + link + (note ? "\n" + note : "") });
    save(); toast(t("delivered_msg")); if (location.hash === "#task/" + id) render(); else location.hash = "#task/" + id;
    /* demo: PM passes review after a while → delivered → done + credit */
    setTimeout(() => { const x = task(id); if (x.status !== "review") return; x.status = "delivered"; x.passedAt = Date.now(); if (st.settings.n_rev) notify("nt_pass", { t: id + " · " + tname(x.type) }, "#task/" + id); save(); if (location.hash === "#task/" + id) render(); else renderChrome(); }, 9000);
    setTimeout(() => { const x = task(id); if (x.status !== "delivered") return; const f = feeOf(x); x.status = "done"; x.doneAt = Date.now(); x.base = f.base; x.bonus = f.bonus; st.profile.deliveries += 1; save(); if (location.hash === "#task/" + id) render(); else renderChrome(); }, 16000);
  }

  document.addEventListener("click", (e) => {
    const lb = e.target.closest("[data-lang]"); if (lb) { window.I18N.setLang(lb.dataset.lang); render(); return; }
    if (e.target.closest("#bell")) { const d = $("#ndrop"); d.hidden = !d.hidden; return; }
    if (!e.target.closest("#ndrop") && !$("#ndrop").hidden) $("#ndrop").hidden = true;
    if (e.target.closest("#readAll")) { st.notifs.forEach((n) => (n.un = false)); save(); renderBell(); if (LIVE) DB.notifs.readAll(); return; }
    const nl = e.target.closest("#ndrop li"); if (nl) { const n = st.notifs.find((x) => String(x.id) === nl.dataset.id); if (n) { n.un = false; if (LIVE) DB.notifs.read(n.id); } save(); $("#ndrop").hidden = true; location.hash = nl.dataset.go; render(); return; }
    const ab = e.target.closest("[data-act]"); if (ab) { e.stopPropagation(); act(ab.dataset.act, ab.dataset.id); return; }
    const tb = e.target.closest(".tabs [data-tab]"); if (tb) { const v = location.hash.slice(1).split("/")[0]; location.hash = "#" + v + "/" + tb.dataset.tab; return; }
    const tc = e.target.closest(".tcard"); if (tc && !e.target.closest("button")) { location.hash = "#task/" + tc.dataset.task; return; }
    const tr = e.target.closest("[data-orig]"); if (tr) { const o = $(`[data-oi="${tr.dataset.orig}"]`); o.hidden = !o.hidden; tr.textContent = o.hidden ? t("show_orig") : t("hide_orig"); return; }
    const qq = e.target.closest("[data-qq]"); if (qq) { const f = $("#chatF"); f.m.value = t(qq.dataset.qq); f.m.focus(); return; }
    if (e.target.closest("[data-back]")) { location.hash = "#msgs"; return; }
    const ch = e.target.closest("[data-skill],[data-tool]"); if (ch) { ch.classList.toggle("on"); return; }
    const rl = e.target.closest(".radio label"); if (rl) { $$(".radio label", rl.parentElement).forEach((l) => l.classList.remove("on")); rl.classList.add("on"); const inp = rl.querySelector("input"); inp.checked = true; inp.dispatchEvent(new Event("change", { bubbles: true })); return; }
    if (e.target.closest("#resetDemo")) { if (LIVE) { DB.auth.signOut().then(() => location.reload()); return; } st = fresh(); save(); toast(t("saved")); render(); return; }
    const les = e.target.closest("[data-les]"); if (les) { const mod = les.closest("[data-mod]").dataset.mod; st.academy[mod][+les.dataset.les] = les.checked; save(); render(); return; }
    const sc = e.target.closest("[data-set]"); if (sc) { st.settings[sc.dataset.set] = sc.checked; save(); return; }
  });
  document.addEventListener("change", (e) => {
    if (e.target.name === "method" && e.target.closest("#payF")) { $("#payFields").innerHTML = payFields(e.target.value, st.profile.payout); }
    if (e.target.name === "lang") { window.I18N.setLang(e.target.value); if (LIVE) DB.auth.updateProfile({ lang: e.target.value }).catch(() => {}); render(); }
    if (e.target.name === "theme") { const v = e.target.value; if (v === "sys") { document.documentElement.removeAttribute("data-theme"); try { localStorage.removeItem("likha-theme"); } catch (x) {} } else { document.documentElement.setAttribute("data-theme", v); try { localStorage.setItem("likha-theme", v); } catch (x) {} } }
  });
  document.addEventListener("input", (e) => { if (e.target.name === "capacity") $("#capV").textContent = e.target.value + " " + t("per_week"); });
  document.addEventListener("submit", (e) => {
    const f = e.target; e.preventDefault();
    if (f.id === "chatF") { const v = f.m.value.trim(); if (!v) return; f.m.value = ""; sendMsg(f.dataset.th, v); }
    else if (f.id === "deliverF") { deliver(location.hash.split("/")[1], f.link.value.trim(), f.note.value.trim()); }
    else if (f.id === "payF") { const p = st.profile.payout; p.method = f.method.value; if (p.method === "bank") { p.bank = f.bank.value; p.acct = f.acct.value; } else p.gcash = f.gcash.value; p.name = f.name.value; save(); if (LIVE) DB.auth.updateProfile({ payout_method: p.method, payout_account: { number: p.gcash, name: p.name, bank: p.bank, acct: p.acct } }).then(() => toast(t("saved"))).catch((e) => toast(e.message)); else toast(t("saved")); }
    else if (f.id === "profF") { const p = st.profile; p.name = f.name.value.trim() || p.name; p.initials = p.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase(); p.city = f.city.value; p.capacity = +f.capacity.value; p.skills = $$("[data-skill].on", f).map((x) => x.dataset.skill); p.tools = $$("[data-tool].on", f).map((x) => x.dataset.tool); p.links = $$("input[name^=link]", f).map((x) => x.value.trim()).filter(Boolean); save(); if (LIVE) DB.auth.updateProfile({ name: p.name, city: p.city, capacity: p.capacity, skills: p.skills, tools: p.tools, portfolio: p.links }).then(() => { toast(t("saved")); render(); }).catch((e) => toast(e.message)); else { toast(t("saved")); render(); } }
  });
  window.addEventListener("hashchange", render);
  window.addEventListener("likha:lang", () => { document.title = "LIKHA " + t("brand_sub"); });

  function gate(kind) {
    const L = window.I18N.lang;
    const copy = kind === "login" ? { ko: ["크리에이터 센터 로그인", "Google 계정으로 로그인하세요. 아직 지원 전이라면 먼저 지원서를 작성해 주세요."], en: ["Sign in to Creator Center", "Sign in with Google. If you haven't applied yet, apply first."], tl: ["Mag-sign in sa Creator Center", "Mag-sign in gamit ang Google. Kung hindi ka pa nag-a-apply, mag-apply muna."] }[L]
      : { ko: ["크리에이터 계정이 아닙니다", "이 계정은 고객 계정입니다. 크리에이터로 지원하려면 지원 페이지로 이동하세요."], en: ["Not a creator account", "This account is a client account. To work as a creator, apply first."], tl: ["Hindi creator account", "Client account ito. Para maging creator, mag-apply muna."] }[L];
    $("#main").innerHTML = `<div class="panel" style="max-width:460px;margin:60px auto;text-align:center"><div class="logo" style="justify-content:center;margin-bottom:14px"><span class="mark"><i></i></span><span class="word">LIKHA</span></div><h2 style="font-size:22px;font-weight:800">${copy[0]}</h2><p class="muted" style="margin:8px 0 18px">${copy[1]}</p>
      ${kind === "login" ? `<button class="btn btn-dark" id="gLogin" style="width:100%">Continue with Google</button><p class="sm muted" style="margin-top:12px"><a class="link" href="index.html#apply">Apply as a creator →</a></p>` : `<a class="btn btn-accent" href="index.html#apply" style="width:100%">Apply as a creator</a><button class="btn btn-ghost" id="gOut" style="width:100%;margin-top:8px">Log out</button>`}</div>`;
    renderChrome();
  }
  document.addEventListener("click", (e) => { if (e.target.closest("#gLogin")) DB.auth.signInGoogle(location.href.split("#")[0]).catch((x) => toast(x.message)); if (e.target.closest("#gOut")) DB.auth.signOut().then(() => location.reload()); });

  if (LIVE) {
    st.tasks = []; st.threads = {}; st.notifs = []; st.payouts = [];
    DB.ready.then(async () => {
      const boot = async (p) => {
        if (!p) return gate("login");
        if (!["creator", "pm", "admin"].includes(p.role)) return gate("role");
        await syncLive(); render();
        if (!boot.sub) { boot.sub = true; DB.notifs.subscribe((n) => { st.notifs.unshift({ id: n.id, k: n.kind, v: n.vars || {}, go: n.link, t: Date.now(), un: true }); renderBell(); syncLive().then(() => { if (!location.hash.startsWith("#msgs/")) render(); }); }); }
      };
      DB.auth.onChange((p, ev) => { if (ev === "SIGNED_OUT") location.reload(); else boot(p); }); boot(DB.auth.user);
    });
  } else render();
})();
