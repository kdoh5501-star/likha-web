/* 서버 전용 Supabase 클라이언트 (service role). Vercel 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   service role 키는 RLS를 우회하므로 절대 프런트/Git에 넣지 말 것. */
const { createClient } = require("@supabase/supabase-js");
function admin() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
/* 요청의 Bearer 토큰으로 사용자 확인 */
async function userFromReq(req) {
  const h = req.headers.authorization || ""; const tok = h.startsWith("Bearer ") ? h.slice(7) : null; if (!tok) return null;
  const a = admin(); if (!a) return null;
  const { data } = await a.auth.getUser(tok); if (!data || !data.user) return null;
  const { data: p } = await a.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  return Object.assign({ id: data.user.id, email: data.user.email }, p || {});
}
function body(req) { let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } } return b || {}; }
function cors(res) { res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*"); res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS"); }
module.exports = { admin, userFromReq, body, cors };
