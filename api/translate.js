/* 메시지 자동 번역 (서버 전용) — DeepL API
   환경변수: DEEPL_API_KEY (선택, 무료 플랜 가능: api-free.deepl.com) · GOOGLE_TRANSLATE_KEY (선택) · TRANSLATE_CONTACT_EMAIL (선택, MyMemory 무료 한도 증가) · SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   키가 하나도 없으면 MyMemory 무료 API로 번역(품질 보통, 일 5천~5만자).
   입력: {message_id}  → messages.tr = {ko, en, tl} 채움. 타갈로그는 DeepL 미지원이라 영어로 대체(추후 Google Translate로 교체 가능).
   권한: 요청자가 해당 스레드 멤버(또는 staff)일 때만. */
const { admin, userFromReq, body, cors } = require("./_supabase");
const LANGS = { ko: "KO", en: "EN-US" };

async function deepl(text, target) {
  const key = process.env.DEEPL_API_KEY; if (!key) return null;
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const r = await fetch(`https://${host}/v2/translate`, { method: "POST", headers: { Authorization: "DeepL-Auth-Key " + key, "Content-Type": "application/json" }, body: JSON.stringify({ text: [text], target_lang: target }) });
  if (!r.ok) return null; const j = await r.json(); return j.translations && j.translations[0] && j.translations[0].text;
}
async function gtranslate(text, target) {
  const key = process.env.GOOGLE_TRANSLATE_KEY; if (!key) return null;
  const r = await fetch("https://translation.googleapis.com/language/translate/v2?key=" + key, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: text, target, format: "text" }) });
  if (!r.ok) return null; const j = await r.json(); return j.data && j.data.translations[0] && j.data.translations[0].translatedText;
}

/* 키 없이 쓰는 무료 폴백 (MyMemory, 일 5만자/이메일). DEEPL/GOOGLE 키가 생기면 자동으로 그쪽이 우선. */
async function mymemory(text, from, to) {
  try {
    const de = process.env.TRANSLATE_CONTACT_EMAIL ? "&de=" + encodeURIComponent(process.env.TRANSLATE_CONTACT_EMAIL) : "";
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=${from}|${to}${de}`);
    if (!r.ok) return null; const j = await r.json(); const t = j.responseData && j.responseData.translatedText;
    if (!t || j.responseStatus !== 200 || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) return null; return t;
  } catch (e) { return null; }
}

module.exports = async (req, res) => {
  cors(res); if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ message: "POST only" });
  const db = admin(); if (!db) return res.status(500).json({ message: "SUPABASE_SERVICE_ROLE_KEY 가 없습니다." });
  const me = await userFromReq(req); if (!me) return res.status(401).json({ message: "로그인이 필요합니다." });
  const { message_id } = body(req); if (!message_id) return res.status(400).json({ message: "message_id 필요" });
  const { data: m } = await db.from("messages").select("*").eq("id", message_id).maybeSingle(); if (!m) return res.status(404).json({ message: "no message" });
  if (!["pm", "admin"].includes(me.role)) { const { data: mem } = await db.from("thread_members").select("user_id").eq("thread_id", m.thread_id).eq("user_id", me.id).maybeSingle(); if (!mem) return res.status(403).json({ message: "forbidden" }); }

  const tr = { [m.lang]: m.text };
  for (const l of ["ko", "en", "tl"]) {
    if (tr[l]) continue;
    let out = null;
    if (l === "tl") out = await gtranslate(m.text, "tl") || await mymemory(m.text, m.lang, "tl") || (tr.en || null);   // DeepL no TL → Google → MyMemory → English
    else out = await deepl(m.text, LANGS[l]) || await gtranslate(m.text, l) || await mymemory(m.text, m.lang, l);
    if (out) tr[l] = out;
  }
  if (!tr.tl && tr.en) tr.tl = tr.en;
  await db.from("messages").update({ tr }).eq("id", m.id);
  /* 수신자 알림 */
  const { data: mem } = await db.from("thread_members").select("user_id").eq("thread_id", m.thread_id).neq("user_id", m.sender_id);
  if (mem && mem.length) await db.from("notifications").insert(mem.map((x) => ({ user_id: x.user_id, kind: "nt_msg", vars: { t: (tr.en || m.text).slice(0, 40) }, link: "#msgs/" + m.thread_id })));
  return res.status(200).json({ tr });
};
