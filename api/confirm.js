/* 토스페이먼츠 결제 승인 + 주문 DB 반영 (서버 전용) — Vercel Serverless Function
   환경변수: TOSS_SECRET_KEY (test_gsk_… / live_gsk_…), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   흐름: 프런트 success.html → POST /api/confirm {paymentKey, orderId(=order_no), amount}
         1) DB 주문의 amount 와 요청 amount 비교 (금액 위변조 방지)
         2) Toss confirm (Idempotency-Key = orderId)
         3) orders.status = paid, payment 정보 저장, 이벤트/알림 기록
   DB 미설정(데모)이면 Toss 승인만 수행. */
const { admin, body, cors } = require("./_supabase");

module.exports = async (req, res) => {
  cors(res); if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ message: "POST only" }); }
  const SECRET = process.env.TOSS_SECRET_KEY;
  if (!SECRET) return res.status(500).json({ message: "TOSS_SECRET_KEY 환경변수가 없습니다." });
  const { paymentKey, orderId, amount } = body(req);
  if (!paymentKey || !orderId || !amount) return res.status(400).json({ message: "paymentKey, orderId, amount 가 필요합니다." });

  const db = admin(); let order = null;
  if (db) {
    const { data } = await db.from("orders").select("*").eq("order_no", orderId).maybeSingle(); order = data;
    if (!order) return res.status(404).json({ message: "주문을 찾을 수 없습니다: " + orderId });
    if (order.status === "paid" || order.status === "req" || order.status === "work") return res.status(200).json({ orderId, already: true, method: order.payment && order.payment.method });
    if (Number(order.amount) !== Number(amount)) return res.status(400).json({ message: "결제 금액이 주문 금액과 다릅니다.", code: "AMOUNT_MISMATCH" });
  }

  const auth = "Basic " + Buffer.from(SECRET + ":").toString("base64");
  let data;
  try {
    const r = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST", headers: { Authorization: auth, "Content-Type": "application/json", "Idempotency-Key": orderId },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) })
    });
    data = await r.json();
    if (!r.ok) { if (db && order) await db.from("order_events").insert({ order_id: order.id, kind: "payment_failed", data }); return res.status(r.status).json({ message: data.message || "승인 실패", code: data.code }); }
  } catch (e) { return res.status(502).json({ message: "토스페이먼츠 승인 요청 중 오류: " + e.message }); }

  const payment = { paymentKey, method: data.method, approvedAt: data.approvedAt, totalAmount: data.totalAmount, receiptUrl: data.receipt && data.receipt.url, provider: "toss" };
  if (db && order) {
    await db.from("orders").update({ status: "paid", payment }).eq("id", order.id);
    await db.from("order_events").insert({ order_id: order.id, actor_id: order.client_id, kind: "paid", data: payment });
    await db.from("notifications").insert({ user_id: order.client_id, kind: "nt_paid", vars: { no: order.order_no }, link: "#order-" + order.id });
    /* PM 전원에게 새 주문 알림 */
    const { data: pms } = await db.from("profiles").select("id").in("role", ["pm", "admin"]);
    if (pms && pms.length) await db.from("notifications").insert(pms.map((p) => ({ user_id: p.id, kind: "nt_new_order", vars: { no: order.order_no }, link: "admin.html#order/" + order.id })));
  }
  return res.status(200).json({ orderId: data.orderId, method: data.method, approvedAt: data.approvedAt, totalAmount: data.totalAmount, receiptUrl: payment.receiptUrl });
};
