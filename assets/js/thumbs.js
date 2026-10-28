/* 서비스 썸네일 — 실제 서비스에서는 크리에이터가 올린 이미지로 교체. 지금은 SVG로 그린 예시 이미지 */
window.LIKHA_THUMB = (function () {
  const PAL = [
    ["#1F2A6B", "#3B4DB8", "#F6C945"],
    ["#0F172A", "#1E293B", "#38BDF8"],
    ["#4C1D95", "#7C3AED", "#F472B6"],
    ["#0F766E", "#14B8A6", "#FDE68A"],
    ["#7C2D12", "#EA580C", "#FFEDD5"],
    ["#111827", "#374151", "#E8461F"]
  ];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const F = "Pretendard,Noto Sans KR,sans-serif";

  function text(x, y, s, size, fill, anchor, weight) {
    const lines = String(s).split("\n");
    return lines.map((l, i) => `<text x="${x}" y="${y + i * size * 1.15}" text-anchor="${anchor || "start"}" font-family="${F}" font-size="${size}" font-weight="${weight || 900}" fill="${fill}" letter-spacing="-0.02em">${esc(l)}</text>`).join("");
  }

  function svg(s, ratio, variant) {
    const w = 400, h = ratio === "tall" ? 711 : ratio === "wide" ? 250 : 300;
    const [c1, c2, c3] = PAL[(s.pal + (variant || 0)) % PAL.length];
    const id = "g" + s.id + (ratio || "") + (variant || 0);
    let art = "";
    const hook = s.hook || "";
    if (s.cat === "shorts") {
      const ph = h * 0.86, pw = ph * 0.5, px = (w - pw) / 2, py = (h - ph) / 2;
      art = `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="18" fill="#0B0F19"/>
      <rect x="${px + 7}" y="${py + 7}" width="${pw - 14}" height="${ph - 14}" rx="13" fill="url(#${id}b)"/>
      <circle cx="${px + pw * 0.5}" cy="${py + ph * 0.36}" r="${pw * 0.26}" fill="#fff" opacity=".12"/>
      <rect x="${px + 16}" y="${py + ph * 0.6}" width="${pw - 32}" height="${ph * 0.11}" rx="6" fill="${c3}"/>
      ${text(px + pw / 2, py + ph * 0.6 + ph * 0.075, hook.split("\n")[0], ph * 0.052, "#111", "middle")}
      <rect x="${px + 22}" y="${py + ph * 0.75}" width="${pw - 44}" height="${ph * 0.03}" rx="3" fill="#fff" opacity=".9"/>
      <rect x="${px + 40}" y="${py + ph * 0.8}" width="${pw - 80}" height="${ph * 0.03}" rx="3" fill="#fff" opacity=".5"/>
      <circle cx="${px + pw - 22}" cy="${py + ph * 0.46}" r="9" fill="#fff" opacity=".9"/><circle cx="${px + pw - 22}" cy="${py + ph * 0.53}" r="9" fill="#fff" opacity=".9"/>`;
    } else if (s.cat === "long" || s.cat === "sub") {
      const fw = w * 0.8, fh = fw * 0.5625, fx = (w - fw) / 2, fy = h * 0.5 - fh * 0.55;
      art = `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="10" fill="#0B0F19"/>
      <rect x="${fx + 4}" y="${fy + 4}" width="${fw - 8}" height="${fh - 8}" rx="8" fill="url(#${id}b)"/>
      <circle cx="${fx + fw * 0.5}" cy="${fy + fh * 0.44}" r="${fh * 0.15}" fill="#fff" opacity=".95"/>
      <path d="M${fx + fw * 0.5 - fh * 0.045} ${fy + fh * 0.36} l${fh * 0.12} ${fh * 0.08} l-${fh * 0.12} ${fh * 0.08}z" fill="${c1}"/>
      <rect x="${fx + 16}" y="${fy + fh * 0.78}" width="${fw * 0.55}" height="${fh * 0.12}" rx="4" fill="#111" opacity=".75"/>
      ${text(fx + 24, fy + fh * 0.87, hook.split("\n")[0], fh * 0.085, "#fff", "start", 800)}
      <rect x="${fx}" y="${fy + fh + 16}" width="${fw}" height="8" rx="4" fill="#fff" opacity=".25"/>
      <rect x="${fx}" y="${fy + fh + 16}" width="${fw * 0.38}" height="8" rx="4" fill="${c3}"/>`;
    } else if (s.cat === "thumb") {
      const fw = w * 0.84, fh = fw * 0.5625, fx = (w - fw) / 2, fy = (h - fh) / 2;
      art = `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="12" fill="url(#${id}b)"/>
      <circle cx="${fx + fw * 0.76}" cy="${fy + fh * 0.5}" r="${fh * 0.36}" fill="#fff" opacity=".14"/>
      <circle cx="${fx + fw * 0.76}" cy="${fy + fh * 0.5}" r="${fh * 0.22}" fill="#fff" opacity=".18"/>
      ${text(fx + fw * 0.08, fy + fh * 0.5, hook, fh * 0.2, c3, "start")}
      <rect x="${fx + fw * 0.08}" y="${fy + fh * 0.78}" width="${fw * 0.34}" height="${fh * 0.07}" rx="3" fill="#fff" opacity=".85"/>`;
    } else if (s.cat === "motion") {
      const cx = w / 2, cy = h / 2, r = h * 0.3;
      art = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-width="12" opacity=".18"/>
      <path d="M${cx} ${cy - r} a${r} ${r} 0 0 1 ${r} ${r}" fill="none" stroke="${c3}" stroke-width="12" stroke-linecap="round"/>
      <circle cx="${cx + r}" cy="${cy}" r="10" fill="#fff"/>
      ${text(cx, cy + h * 0.045, hook, h * 0.11, "#fff", "middle")}`;
    } else {
      let g = "";
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g += `<rect x="${w * 0.1 + i * w * 0.28}" y="${h * 0.14 + j * h * 0.37}" width="${w * 0.24}" height="${h * 0.3}" rx="10" fill="#fff" opacity="${0.12 + ((i + j) % 3) * 0.1}"/>`;
      art = g + `<rect x="${w * 0.1}" y="${h * 0.14}" width="${w * 0.24}" height="${h * 0.3}" rx="10" fill="${c3}" opacity=".9"/>` + text(w / 2, h * 0.93, hook, h * 0.09, "#fff", "middle");
    }
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(s.title)} 예시 이미지">
      <defs><linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#${id}a)"/>${art}</svg>`;
  }

  function heroArt(kind) {
    if (kind === 1) return `<svg viewBox="0 0 420 300" fill="none"><rect x="30" y="20" width="360" height="220" rx="16" fill="#fff" opacity=".08"/><rect x="50" y="40" width="200" height="120" rx="10" fill="#fff" opacity=".18"/><rect x="265" y="40" width="105" height="56" rx="8" fill="#fff" opacity=".18"/><rect x="265" y="104" width="105" height="56" rx="8" fill="#F6C945"/><rect x="50" y="175" width="320" height="10" rx="5" fill="#fff" opacity=".3"/><rect x="50" y="175" width="130" height="10" rx="5" fill="#F6C945"/><rect x="50" y="200" width="90" height="22" rx="6" fill="#fff" opacity=".2"/><rect x="150" y="200" width="60" height="22" rx="6" fill="#fff" opacity=".2"/><circle cx="330" cy="255" r="26" fill="#F6C945"/><path d="m320 255 7 7 14-14" stroke="#1F2A6B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    if (kind === 2) return `<svg viewBox="0 0 420 300" fill="none"><rect x="120" y="14" width="180" height="272" rx="26" fill="#fff" opacity=".1"/><rect x="132" y="26" width="156" height="248" rx="18" fill="#fff" opacity=".12"/><rect x="150" y="190" width="120" height="30" rx="8" fill="#E8461F"/><rect x="160" y="228" width="100" height="8" rx="4" fill="#fff" opacity=".8"/><rect x="175" y="244" width="70" height="8" rx="4" fill="#fff" opacity=".4"/><circle cx="210" cy="110" r="34" fill="#fff" opacity=".9"/><path d="m200 96 26 14-26 14z" fill="#111827"/></svg>`;
    return `<svg viewBox="0 0 420 300" fill="none"><rect x="40" y="60" width="150" height="180" rx="12" fill="#fff" opacity=".12"/><rect x="230" y="60" width="150" height="180" rx="12" fill="#fff" opacity=".12"/><rect x="56" y="76" width="118" height="80" rx="8" fill="#fff" opacity=".2"/><rect x="246" y="76" width="118" height="80" rx="8" fill="#fff" opacity=".2"/><rect x="56" y="170" width="90" height="10" rx="5" fill="#fff" opacity=".6"/><rect x="246" y="170" width="90" height="10" rx="5" fill="#fff" opacity=".6"/><rect x="56" y="192" width="60" height="10" rx="5" fill="#fff" opacity=".3"/><rect x="246" y="192" width="60" height="10" rx="5" fill="#fff" opacity=".3"/><rect x="56" y="214" width="70" height="14" rx="4" fill="#FDE68A"/><rect x="246" y="214" width="70" height="14" rx="4" fill="#FDE68A"/><path d="M195 150h30" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="m218 142 8 8-8 8" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  /* 실제 이미지가 있으면 <img>, 없으면 SVG */
  const IMG = window.LIKHA_IMG || {};
  function img(s, ratio, variant) {
    const key = ratio === "tall" ? "pf" : "thumb";
    const src = (IMG[key] || {})[s.id];
    if (src && !variant) return `<img src="${src}" alt="${esc(s.title)}" loading="lazy" decoding="async">`;
    return svg(s, ratio, variant);
  }
  return { svg, img, heroArt, PAL };
})();
