/* 토스페이먼츠 결제 승인 (서버 전용) — Vercel Serverless Function
   배포: 저장소를 Vercel에 연결하고 환경변수 TOSS_SECRET_KEY 를 설정하면 /api/confirm 로 동작
   테스트 키: 토스 개발자센터 → API 키 → 결제위젯 연동 키의 시크릿 키 (test_gsk_…)
   운영 전환: live_gsk_… 로 교체. 시크릿 키는 절대 프런트 코드나 Git에 넣지 말 것 */
module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ message: "POST only" }); }
  const SECRET = process.env.TOSS_SECRET_KEY;
  if (!SECRET) return res.status(500).json({ message: "TOSS_SECRET_KEY 환경변수가 없습니다." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const { paymentKey, orderId, amount } = body || {};
  if (!paymentKey || !orderId || !amount) return res.status(400).json({ message: "paymentKey, orderId, amount 가 필요합니다." });

  /* TODO: 실제 운영에서는 DB에 저장해 둔 주문 금액과 amount 가 같은지 여기서 검증 */

  const auth = "Basic " + Buffer.from(SECRET + ":").toString("base64");
  try {
    const r = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", "Idempotency-Key": orderId },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ message: data.message || "승인 실패", code: data.code });
    /* TODO: 주문 상태를 '결제 완료'로 저장, 알림톡·이메일 발송 */
    return res.status(200).json({ orderId: data.orderId, method: data.method, approvedAt: data.approvedAt, totalAmount: data.totalAmount, receiptUrl: data.receipt && data.receipt.url });
  } catch (e) {
    return res.status(502).json({ message: "토스페이먼츠 승인 요청 중 오류: " + e.message });
  }
};
