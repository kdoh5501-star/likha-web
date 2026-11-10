/* 주문 환불 (서버 전용) — 토스페이먼츠 결제 취소 + 주문 상태 반영
   권한: pm/admin 만. 입력: {order_id, reason, amount?}  (amount 없으면 전액)
   정책(환불규정 페이지와 동일): 작업 시작 전(paid/req) 전액, 작업 중(work/review)은 PM이 금액 지정(부분 환불), 납품 이후는 수정요청으로 처리.
   환경변수: TOSS_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY */
const { admin, userFromReq, body, cors } = require("./_supabase");

module.exports = async (req, res) => {
  cors(res); if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ message: "POST only" });
  const SECRET = process.env.TOSS_SECRET_KEY; if (!SECRET) return res.status(500).json({ message: "TOSS_SECRET_KEY 환경변수가 없습니다." });
  const db = admin(); if (!db) return res.status(500).json({ message: "SUPABASE_SERVICE_ROLE_KEY 가 없습니다." });
  const me = await userFromReq(req); if (!me || !["pm", "admin"].includes(me.role)) return res.status(403).json({ message: "PM/관리자만 환불할 수 있습니다." });

  const { order_id, reason, amount } = body(req);
  if (!order_id) return res.status(400).json({ message: "order_id 필요" });
  const { data: o } = await db.from("orders").select("*").eq("id", order_id).maybeSingle();
  if (!o) return res.status(404).json({ message: "주문 없음" });
  if (!o.payment || !o.payment.paymentKey) return res.status(400).json({ message: "결제 정보가 없는 주문입니다." });
  if (["refunded", "cancelled", "pending_payment"].includes(o.status)) return res.status(400).json({ message: "이미 취소/환불된 주문입니다." });
  if (o.status === "done") return res.status(400).json({ message: "구매 확정된 주문은 환불할 수 없습니다 (환불 규정)." });

  const full = ["paid", "req"].includes(o.status) || !amount;
  const cancelAmount = full ? Number(o.amount) : Math.min(Number(amount), Number(o.amount));
  if (!(cancelAmount > 0)) return res.status(400).json({ message: "환불 금액이 올바르지 않습니다." });

  const auth = "Basic " + Buffer.from(SECRET + ":").toString("base64");
  let data;
  try {
    const r = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(o.payment.paymentKey)}/cancel`, {
      method: "POST", headers: { Authorization: auth, "Content-Type": "application/json", "Idempotency-Key": `refund-${o.id}-${cancelAmount}` },
      body: JSON.stringify({ cancelReason: (reason || "고객 요청 환불").slice(0, 200), cancelAmount })
    });
    data = await r.json();
    if (!r.ok) { await db.from("order_events").insert({ order_id: o.id, actor_id: me.id, kind: "refund_failed", data }); return res.status(r.status).json({ message: data.message || "취소 실패", code: data.code }); }
  } catch (e) { return res.status(502).json({ message: "토스페이먼츠 취소 요청 중 오류: " + e.message }); }

  const refund = { amount: cancelAmount, full: cancelAmount >= Number(o.amount), reason: reason || "", at: new Date().toISOString(), by: me.id, cancels: data.cancels };
  const payment = Object.assign({}, o.payment, { refund });
  await db.from("orders").update({ status: refund.full ? "refunded" : o.status, payment }).eq("id", o.id);
  if (refund.full) await db.from("tasks").update({ status: "declined" }).eq("order_id", o.id).in("status", ["offer", "open"]);
  await db.from("order_events").insert({ order_id: o.id, actor_id: me.id, kind: "refund", data: refund });
  await db.from("notifications").insert({ user_id: o.client_id, kind: "nt_refund", vars: { no: o.order_no, a: cancelAmount.toLocaleString("ko-KR") }, link: "#order-" + o.id });
  return res.status(200).json({ ok: true, refund });
};
