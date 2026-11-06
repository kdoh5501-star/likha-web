/* LIKHA Creator Center — seed data (demo). Fees in PHP. Client prices are never included. */
(function () {
  const now = Date.now(), H = 36e5, D = 864e5;
  const iso = (ms) => new Date(ms).toISOString();

  const TYPES = {
    short: { key: "t_short", fee: 500, est: "45–90 min", maxRev: 1, specs: "1080×1920 · MP4 H.264 · ≤60 s · captions burned in · music ≤ -14 LUFS" },
    long: { key: "t_long", fee: 2500, est: "6–8 h", maxRev: 2, specs: "1920×1080 · MP4 H.264 · 10–15 min · SRT + burned captions · chapters list" },
    thumb: { key: "t_thumb", fee: 250, est: "30–45 min", maxRev: 1, specs: "1280×720 · JPG ≤ 2 MB + PSD · Korean text provided by PM" },
    sub: { key: "t_sub", fee: 300, est: "40–60 min", maxRev: 1, specs: "SRT · ≤ 42 chars/line · 2 lines max · timing ±100 ms" },
    motion: { key: "t_motion", fee: 1000, est: "3–4 h", maxRev: 2, specs: "1920×1080 · ProRes or H.264 · 5–10 s · alpha version included" },
    ai: { key: "t_ai", fee: 1200, est: "3–5 h", maxRev: 2, specs: "1080×1920 · 30 s · 6 AI scenes · brand colors from brief" }
  };

  const PMS = { yuna: { name: "Yuna Kim", initials: "YK" }, minho: { name: "Minho Park", initials: "MP" } };

  /* brief: en (what the creator reads). client aliases only, never real names. */
  const TASKS = [
    { id: "T-2611-0412", type: "short", status: "offer", client: "Skin clinic · Gangnam", pm: "yuna", due: now + 26 * H, expires: now + 6 * H,
      brief: "Talking-head short from a 3-min dermatologist clip. Hook in first 2 s with the question on screen. Korean captions: bold white, yellow keyword highlights (we mark keywords in the script). Add 2–3 B-roll cutaways from the clinic folder. Upbeat but calm music.",
      files: ["raw_clinic_1104.mp4 (3:12, 4K)", "script_EN_KO.docx", "broll_clinic/ (8 clips)"], refs: ["ref_shorts_clinicA.mp4", "ref_caption_style_02.png"] },
    { id: "T-2611-0415", type: "thumb", status: "offer", client: "Tax YouTube channel", pm: "minho", due: now + 20 * H, expires: now + 9 * H,
      brief: "YouTube thumbnail for '연말정산 꿀팁 5가지'. Presenter cut-out on left, big Korean headline on right (text provided: 연말정산 / 5가지). Navy + yellow. Match the channel's last 3 thumbnails.",
      files: ["presenter_still_03.jpg", "channel_thumbs_ref/ (3 jpg)", "headline_text.txt"], refs: ["thumb_ref_tax_channel.png"] },
    { id: "T-2611-0398", type: "short", status: "work", client: "Online shop · skincare", pm: "yuna", due: now + 5 * H, accepted: now - 18 * H,
      brief: "Product reel #4 of 10 from the shoot folder. Same template as #1–#3 (CapCut template in Academy). Show the serum texture close-up at 0:08. CTA card at the end: '링크는 프로필에'.",
      files: ["shoot_1102/ (24 clips)", "template_reel_v2.capcut", "cta_card.png"], refs: ["reel_01_approved.mp4", "reel_02_approved.mp4"] },
    { id: "T-2611-0391", type: "long", status: "work", client: "English academy · Daegu", pm: "minho", due: now + 2 * D + 3 * H, accepted: now - 1 * D,
      brief: "12-min lecture edit. Cut dead air and filler, keep all slide moments. Burned Korean captions (SRT provided, review timing). Add chapter title cards at the 5 timestamps in the script. Lower-third with teacher name at 0:05.",
      files: ["lecture_raw.mp4 (31:40)", "captions_KO.srt", "chapters.txt", "lowerthird_template.aep"], refs: ["ep12_approved.mp4"] },
    { id: "T-2611-0377", type: "short", status: "review", client: "Fitness studio · Busan", pm: "yuna", due: now - 4 * H, accepted: now - 2 * D, deliveredAt: now - 5 * H, link: "https://drive.google.com/…/fit_short_v1.mp4",
      brief: "Before/after transformation short. Split-screen at 0:03. Captions synced to the beat drop at 0:07.", files: ["fit_raw/ (6 clips)"], refs: ["ref_transformation.mp4"] },
    { id: "T-2611-0370", type: "sub", status: "revision", client: "Dental clinic · Seoul", pm: "minho", due: now + 8 * H, accepted: now - 2 * D, deliveredAt: now - 20 * H, rev: 1, link: "https://drive.google.com/…/dental_sub_v1.srt",
      revNotes: "Timing drifts after 04:10 by about 300 ms — please re-sync from there. Line 37: '임플란트' should stay in Korean, don't translate the term. Everything else approved.",
      brief: "Korean SRT for an 8-min dental Q&A. Script provided; your job is timing and line breaks.", files: ["dental_qa.mp4 (8:05)", "script_KO.txt"], refs: [] },
    { id: "T-2611-0366", type: "short", status: "delivered", client: "Skin clinic · Gangnam", pm: "yuna", due: now - 1 * D, accepted: now - 3 * D, deliveredAt: now - 1 * D - 2 * H, passedAt: now - 1 * D,
      brief: "Acne-care routine short, 3 steps with numbered captions.", files: ["raw_routine.mp4"], refs: [] },
    { id: "T-2611-0350", type: "thumb", status: "done", client: "Tax YouTube channel", pm: "minho", due: now - 3 * D, accepted: now - 4 * D, deliveredAt: now - 3 * D - 4 * H, passedAt: now - 3 * D, doneAt: now - 2 * D, base: 250, bonus: 25,
      brief: "Thumbnail: '부가세 신고 마감'.", files: [], refs: [] },
    { id: "T-2611-0349", type: "short", status: "done", client: "Online shop · skincare", pm: "yuna", due: now - 4 * D, accepted: now - 5 * D, deliveredAt: now - 4 * D - 3 * H, passedAt: now - 4 * D, doneAt: now - 3 * D, base: 500, bonus: 50, brief: "Product reel #3 of 10.", files: [], refs: [] },
    { id: "T-2611-0341", type: "short", status: "done", client: "Online shop · skincare", pm: "yuna", due: now - 6 * D, accepted: now - 7 * D, deliveredAt: now - 6 * D - 2 * H, passedAt: now - 6 * D, doneAt: now - 5 * D, base: 500, bonus: 50, brief: "Product reel #2 of 10.", files: [], refs: [] },
    { id: "T-2611-0333", type: "ai", status: "done", client: "Cafe franchise · Seoul", pm: "minho", due: now - 9 * D, accepted: now - 11 * D, deliveredAt: now - 9 * D - 6 * H, passedAt: now - 9 * D, doneAt: now - 8 * D, base: 1200, bonus: 120, brief: "AI ad, winter menu launch.", files: [], refs: [] },
    /* open board */
    { id: "T-2611-0420", type: "short", status: "open", client: "Pet shop · Incheon", pm: "yuna", due: now + 2 * D, minLevel: 1,
      brief: "Unboxing short, 45 s. Playful captions, 3 sound effects from the LIKHA SFX pack.", files: ["unboxing_raw.mp4 (4:20)"], refs: ["ref_pet_short.mp4"] },
    { id: "T-2611-0421", type: "long", status: "open", client: "Law firm · Seoul", pm: "minho", due: now + 3 * D, minLevel: 2,
      brief: "14-min legal explainer. Formal tone, no SFX. Burned captions with legal terms kept in Korean (list provided).", files: ["law_raw.mp4 (28:10)", "terms_keep_KO.txt"], refs: ["law_ep03_approved.mp4"] },
    { id: "T-2611-0422", type: "motion", status: "open", client: "Hair salon chain", pm: "yuna", due: now + 4 * D, minLevel: 2,
      brief: "6-second logo intro, AE. Logo provided as AI/SVG. Brand colors #1F2A6B / #E8461F. Two variants: light and dark background.", files: ["logo.ai", "brand_colors.pdf"], refs: ["intro_ref_01.mp4"] },
    { id: "T-2611-0423", type: "ai", status: "open", client: "Cafe franchise · Seoul", pm: "minho", due: now + 5 * D, minLevel: 3,
      brief: "30-s AI ad for a strawberry latte launch. 6 scenes, Higgsfield or Kling. Product shots must use the provided photos, not generated.", files: ["product_photos/ (12 jpg)", "brand_kit.pdf"], refs: ["ai_ad_winter_approved.mp4"] }
  ];

  /* PM messages carry ko (original) + en + tl (auto-translation, demo) */
  const THREADS = {
    support: { kind: "support", msgs: [
      { from: "pm", t: now - 6 * D, ko: "LIKHA에 오신 것을 환영합니다! 정산, 계정, 계약 관련 질문은 여기로 남겨주세요.", en: "Welcome to LIKHA! Ask here about payouts, your account, or your contract.", tl: "Welcome sa LIKHA! Dito magtanong tungkol sa payout, account, o kontrata." }
    ] },
    "pm:yuna": { kind: "pm", pm: "yuna", msgs: [
      { from: "pm", t: now - 2 * D, ko: "마리아님, 스킨케어 릴스 1~3편 전부 1회 통과했어요. 고객이 아주 만족했습니다. 같은 템플릿으로 4~10편도 부탁드릴게요.", en: "Maria, skincare reels #1–#3 all passed first review. The client is very happy. Please keep the same template for #4–#10.", tl: "Maria, pasado agad lahat ng skincare reels #1–#3. Sobrang saya ng client. Same template lang para sa #4–#10." },
      { from: "me", t: now - 2 * D + 20 * 60e3, text: "Thank you! Will do. Should I keep the CTA card the same on all of them?" },
      { from: "pm", t: now - 2 * D + 35 * 60e3, ko: "네, CTA 카드는 동일하게 유지해 주세요. 텍스트만 '링크는 프로필에'로 바뀌었습니다. 새 파일 올려뒀어요.", en: "Yes, keep the CTA card the same. Only the text changed to '링크는 프로필에'. I uploaded the new file.", tl: "Oo, same lang ang CTA card. Ang text lang ang nagbago sa '링크는 프로필에'. Na-upload ko na ang bagong file." }
    ] },
    "pm:minho": { kind: "pm", pm: "minho", msgs: [
      { from: "pm", t: now - 20 * H, ko: "치과 자막 건 수정 요청 하나 보냈습니다. 타이밍만 다시 맞추면 바로 통과할 것 같아요.", en: "Sent one revision request on the dental subtitles. Just re-sync the timing and it should pass right away.", tl: "Nagpadala ako ng isang revision sa dental subtitles. I-resync lang ang timing at papasa na agad." }
    ] },
    "task:T-2611-0398": { kind: "task", task: "T-2611-0398", pm: "yuna", msgs: [
      { from: "pm", t: now - 18 * H, ko: "4편 시작하셨죠? 0:08 세럼 텍스처 클로즈업은 shoot_1102 폴더의 clip_17이 제일 좋아요.", en: "Started #4? For the serum texture close-up at 0:08, clip_17 in the shoot_1102 folder is the best one.", tl: "Nasimulan mo na ang #4? Para sa serum close-up sa 0:08, clip_17 sa shoot_1102 folder ang pinakamaganda." }
    ] },
    "task:T-2611-0370": { kind: "task", task: "T-2611-0370", pm: "minho", msgs: [
      { from: "pm", t: now - 20 * H, ko: "04:10 이후 싱크가 약 300ms 밀립니다. 그리고 37번 줄 '임플란트'는 한국어 그대로 두세요.", en: "Timing drifts ~300 ms after 04:10. And on line 37 keep '임플란트' in Korean.", tl: "Lumalampas ng ~300 ms ang timing pagkatapos ng 04:10. At sa line 37, panatilihin ang '임플란트' sa Korean." }
    ] }
  };

  /* canned PM replies (demo), keyed by rough intent */
  const PM_REPLIES = {
    link: { ko: "링크 다시 확인해서 권한 열어드렸어요. 지금 다시 열어보시겠어요?", en: "I checked the link and opened the permission. Could you try again now?", tl: "Na-check ko ang link at binuksan ang permission. Pakisubukan ulit ngayon?" },
    ref: { ko: "레퍼런스 2개 더 올렸습니다. 작업 폴더의 refs/에 있어요.", en: "Uploaded two more references. They're in refs/ in the task folder.", tl: "Nag-upload ako ng dalawa pang reference. Nasa refs/ sa task folder." },
    ext: { ko: "하루 연장 가능합니다. 마감을 내일 같은 시간으로 바꿨어요. 다음부터는 미리 알려주시면 더 좋아요.", en: "One-day extension is fine. I moved the deadline to the same time tomorrow. Next time, a heads-up earlier helps.", tl: "Okay ang isang araw na extension. Inilipat ko ang deadline bukas, same time. Sa susunod, mas maganda kung maaga ang abiso." },
    thanks: { ko: "네, 확인했습니다. 고생하셨어요!", en: "Got it, thanks. Nice work!", tl: "Sige, nakita ko. Salamat, galing!" },
    default: { ko: "확인했습니다. 잠시 후 답변드릴게요.", en: "Noted. I'll get back to you shortly.", tl: "Nakita ko. Sasagot ako maya-maya." }
  };

  const PROFILE = {
    name: "Maria Santos", initials: "MS", city: "Las Piñas", level: 2, deliveries: 68, pass: 91, ontime: 97, since: "2026-09",
    skills: ["short", "thumb", "sub"], tools: ["CapCut", "Premiere Pro", "Photoshop"], capacity: 25,
    links: ["https://www.tiktok.com/@maria.edits", "https://drive.google.com/drive/folders/portfolio-maria"],
    payout: { method: "gcash", gcash: "0917 *** 4821", name: "Maria C. Santos", bank: "", acct: "" }
  };

  const LEVELS = [
    { n: 1, bonus: 0, need: 0 }, { n: 2, bonus: 10, need: 50 }, { n: 3, bonus: 20, need: 200 }, { n: 4, bonus: 30, need: 500 }
  ];

  const PAYOUTS = [
    { date: "2026-10-30", amount: 7920, method: "GCash", status: "paid" },
    { date: "2026-10-15", amount: 5610, method: "GCash", status: "paid" },
    { date: "2026-09-30", amount: 3300, method: "GCash", status: "paid" }
  ];

  const ACADEMY = [
    { id: "w1", key: "ac_w1", lessons: ["Korean short-form grammar: cut speed and hook", "Caption styles: size, color, keyword highlight", "Sound effects and music levels", "Tone by industry: clinic, shop, academy"] },
    { id: "w2", key: "ac_w2", lessons: ["Reading a LIKHA brief", "Templates: CapCut and Premiere packs", "File specs and naming", "PM review checklist", "AI captioning and cut tools", "Mock orders (3)"] },
    { id: "test", key: "ac_test", lessons: ["Test task 1: 45-s talking-head short", "Test task 2: thumbnail"] }
  ];

  const CHECKLIST = {
    short: ["Hook text visible within the first 2 seconds", "Captions match the script, keywords highlighted", "Music under voice (voice clearly audible)", "1080×1920, no black bars, under 60 s", "File named LIKHA_<taskId>_v<n>.mp4"],
    long: ["Dead air and filler removed", "All chapter cards placed at the timestamps", "SRT timing checked across the full video", "Lower-third at 0:05", "1920×1080 H.264, chapters list attached"],
    thumb: ["Korean text copied exactly from the brief", "Face cut-out clean, no halo", "Readable at 200 px wide", "JPG under 2 MB + PSD attached"],
    sub: ["No line over 42 characters", "Timing within ±100 ms", "Terms list kept in Korean", "SRT opens in VLC without errors"],
    motion: ["Both background variants rendered", "Alpha version included", "Logo not distorted, brand colors exact"],
    ai: ["Product shots use provided photos", "6 scenes, 30 s total", "Brand colors applied", "No artifacts on faces or text"]
  };

  window.LIKHA_SEED = { TYPES, PMS, TASKS, THREADS, PM_REPLIES, PROFILE, LEVELS, PAYOUTS, ACADEMY, CHECKLIST, iso };
})();
