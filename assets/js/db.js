/* LIKHA 데이터 계층.
   LIVE 모드(config.js에 Supabase 키 있음): Supabase Auth(구글) + Postgres + Realtime.
   DEMO 모드(키 없음): localStorage. 기존 app.js / creator.js 의 로컬 로직이 그대로 동작.
   화면 코드는 DB.live 로 분기하고, 이 파일의 API 만 호출한다. */
(function () {
  const C = window.LIKHA_CONFIG || {}, live = !!window.LIKHA_LIVE;
  let sb = null, _profile = null, listeners = [];

  function loadSdk() {
    return new Promise((ok, no) => {
      if (window.supabase) return ok();
      const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js"; s.onload = ok; s.onerror = () => no(new Error("supabase sdk")); document.head.appendChild(s);
    });
  }
  async function init() {
    if (!live) return;
    await loadSdk();
    sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    sb.auth.onAuthStateChange(async (ev, session) => { _profile = session ? await fetchProfile(session.user) : null; listeners.forEach((f) => f(_profile, ev)); });
    const { data } = await sb.auth.getSession(); if (data.session) _profile = await fetchProfile(data.session.user);
  }
  async function fetchProfile(u) {
    const { data } = await sb.from("profiles").select("*").eq("id", u.id).maybeSingle();
    return Object.assign({ id: u.id, email: u.email, name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || u.email, avatar_url: u.user_metadata && u.user_metadata.avatar_url, role: "client" }, data || {});
  }
  const ready = init().catch((e) => console.warn("LIKHA DB init failed, demo mode", e));

  /* ---------- auth ---------- */
  const auth = {
    get user() { return _profile; },
    onChange(f) { listeners.push(f); },
    async signInGoogle(redirectTo) {
      if (!live) throw new Error("demo");
      const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo || location.href, queryParams: { prompt: "select_account" } } });
      if (error) throw error;
    },
    async signInEmail(email, redirectTo) {
      if (!live) throw new Error("demo");
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo || location.href } }); if (error) throw error;
    },
    async signOut() { if (live) await sb.auth.signOut(); _profile = null; listeners.forEach((f) => f(null, "SIGNED_OUT")); },
    async updateProfile(patch) {
      if (!live) return Object.assign(_profile || {}, patch);
      const { data, error } = await sb.from("profiles").update(patch).eq("id", _profile.id).select().single(); if (error) throw error; _profile = data; return data;
    },
    async setRole(role) { return auth.updateProfile({ role, onboarded: true }); }   // allowed only client↔creator on first onboarding (RLS blocks role change after; staff via admin)
  };

  /* ---------- orders (client / staff) ---------- */
  const orders = {
    async create(o) {  // {service_id, package_code, options, qty, amount, coupon}
      const no = "LK-" + new Date().toISOString().slice(2, 7).replace("-", "") + "-" + String(Math.floor(1000 + Math.random() * 9000));
      const { data, error } = await sb.from("orders").insert({ ...o, order_no: no, client_id: _profile.id, status: "pending_payment" }).select().single(); if (error) throw error; return data;
    },
    async mine() { const { data, error } = await sb.from("orders").select("*").eq("client_id", _profile.id).order("created_at", { ascending: false }); if (error) throw error; return data; },
    async get(id) { const { data, error } = await sb.from("orders").select("*").eq("id", id).maybeSingle(); if (error) throw error; return data; },
    async byNo(no) { const { data, error } = await sb.from("orders").select("*").eq("order_no", no).maybeSingle(); if (error) throw error; return data; },
    async update(id, patch) { const { data, error } = await sb.from("orders").update(patch).eq("id", id).select().single(); if (error) throw error; return data; },
    async event(order_id, kind, data) { await sb.from("order_events").insert({ order_id, actor_id: _profile.id, kind, data }); },
    async events(order_id) { const { data } = await sb.from("order_events").select("*").eq("order_id", order_id).order("created_at"); return data || []; },
    async all(status) { let q = sb.from("orders").select("*, client:profiles!orders_client_id_fkey(name,email,company), service:services(title)").order("created_at", { ascending: false }); if (status) q = q.eq("status", status); const { data, error } = await q; if (error) throw error; return data; },
    /* 서버 승인: Toss confirm → DB paid. 시크릿 키는 서버에만. */
    async confirmPayment(paymentKey, orderId, amount) {
      const { data: s } = await sb.auth.getSession();
      const r = await fetch(C.API_BASE + "/confirm", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (s.session && s.session.access_token) }, body: JSON.stringify({ paymentKey, orderId, amount }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.message || "confirm failed"), { status: r.status, code: j.code }); return j;
    }
  };

  /* ---------- tasks (creator / staff) ---------- */
  const tasks = {
    async mine() { const { data, error } = await sb.from("tasks").select("*, pm:profiles!tasks_pm_id_fkey(name)").or(`creator_id.eq.${_profile.id},status.eq.open`).order("due_at"); if (error) throw error; return data; },
    async get(id) { const { data, error } = await sb.from("tasks").select("*").eq("id", id).maybeSingle(); if (error) throw error; return data; },
    async accept(id) { const { data, error } = await sb.from("tasks").update({ status: "work", creator_id: _profile.id, accepted_at: new Date().toISOString(), expires_at: null }).eq("id", id).select().single(); if (error) throw error; await threads.ensureTask(data); return data; },
    async decline(id) { const { error } = await sb.from("tasks").update({ status: "declined" }).eq("id", id); if (error) throw error; },
    async deliver(id, link, note, isRev) { const { data, error } = await sb.from("tasks").update({ status: "review", delivered_at: new Date().toISOString(), deliverable: { link, note, submitted_at: new Date().toISOString() }, ...(isRev ? {} : {}) }).eq("id", id).select().single(); if (error) throw error; return data; },
    /* staff */
    async all(status) { let q = sb.from("tasks").select("*, creator:profiles!tasks_creator_id_fkey(name,level,email)").order("created_at", { ascending: false }); if (status) q = q.eq("status", status); const { data, error } = await q; if (error) throw error; return data; },
    async create(t) { const no = "T-" + new Date().toISOString().slice(2, 7).replace("-", "") + "-" + String(Math.floor(1000 + Math.random() * 9000)); const { data, error } = await sb.from("tasks").insert({ ...t, task_no: no, pm_id: _profile.id }).select().single(); if (error) throw error; return data; },
    async update(id, patch) { const { data, error } = await sb.from("tasks").update(patch).eq("id", id).select().single(); if (error) throw error; return data; },
    async creators() { const { data } = await sb.from("profiles").select("id,name,level,skills,tools,capacity,deliveries,first_pass,ontime,city").eq("role", "creator").order("level", { ascending: false }); return data || []; }
  };

  /* ---------- threads / messages ---------- */
  const threads = {
    async list() {
      const { data, error } = await sb.from("threads").select("*, members:thread_members(user_id,last_read_at), task:tasks(task_no,type,client_alias), order:orders(order_no)").order("last_at", { ascending: false }); if (error) throw error; return data;
    },
    async ensure(kind, ref, members) {
      let q = sb.from("threads").select("*").eq("kind", kind); if (ref && ref.task_id) q = q.eq("task_id", ref.task_id); if (ref && ref.order_id) q = q.eq("order_id", ref.order_id);
      const { data: ex } = await q.limit(1); if (ex && ex.length) return ex[0];
      const { data, error } = await sb.from("threads").insert({ kind, ...(ref || {}) }).select().single(); if (error) throw error;
      const ids = [...new Set([_profile.id, ...(members || [])].filter(Boolean))];
      await sb.from("thread_members").upsert(ids.map((user_id) => ({ thread_id: data.id, user_id })), { onConflict: "thread_id,user_id" }); return data;
    },
    async ensureTask(t) { return threads.ensure("task", { task_id: t.id }, [t.creator_id, t.pm_id]); },
    async ensureSupport() { return threads.ensure("support", null, []); },
    async messages(thread_id) { const { data, error } = await sb.from("messages").select("*, sender:profiles(name,role,avatar_url)").eq("thread_id", thread_id).order("created_at"); if (error) throw error; return data; },
    async send(thread_id, text, lang) {
      const { data, error } = await sb.from("messages").insert({ thread_id, sender_id: _profile.id, text, lang: lang || _profile.lang || "en" }).select().single(); if (error) throw error;
      /* 번역은 서버 함수가 비동기로 채움 (DeepL). 실패해도 원문은 남는다. */
      try { const { data: s } = await sb.auth.getSession(); fetch(C.API_BASE + "/translate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.session.access_token }, body: JSON.stringify({ message_id: data.id }) }).catch(() => {}); } catch (e) {}
      return data;
    },
    async markRead(thread_id) { await sb.from("thread_members").upsert({ thread_id, user_id: _profile.id, last_read_at: new Date().toISOString() }, { onConflict: "thread_id,user_id" }); },
    subscribe(thread_id, cb) { const ch = sb.channel("m:" + thread_id).on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: "thread_id=eq." + thread_id }, (p) => cb(p.new)).subscribe(); return () => sb.removeChannel(ch); }
  };

  /* ---------- notifications ---------- */
  const notifs = {
    async list() { const { data } = await sb.from("notifications").select("*").eq("user_id", _profile.id).order("created_at", { ascending: false }).limit(30); return data || []; },
    async readAll() { await sb.from("notifications").update({ read: true }).eq("user_id", _profile.id).eq("read", false); },
    async read(id) { await sb.from("notifications").update({ read: true }).eq("id", id); },
    async push(user_id, kind, vars, link) { await sb.from("notifications").insert({ user_id, kind, vars, link }); },
    subscribe(cb) { const ch = sb.channel("n:" + _profile.id).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: "user_id=eq." + _profile.id }, (p) => cb(p.new)).subscribe(); return () => sb.removeChannel(ch); }
  };

  /* ---------- storage ---------- */
  const files = {
    async upload(bucket, file, folder) {
      const path = `${_profile.id}/${folder || "misc"}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: false }); if (error) throw error; return { bucket, path, name: file.name, size: file.size };
    },
    async url(bucket, path) { const { data } = await sb.storage.from(bucket).createSignedUrl(path, 3600); return data && data.signedUrl; }
  };

  const payouts = {
    async mine() { const { data } = await sb.from("payouts").select("*").eq("creator_id", _profile.id).order("period_end", { ascending: false }); return data || []; }
  };

  window.DB = { live, ready, auth, orders, tasks, threads, notifs, files, payouts, get sb() { return sb; } };
})();
