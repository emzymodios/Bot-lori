// =============================================
// utils/rankCard.js — Tạo ảnh rank card PNG
// =============================================

const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Bo tròn rectangle
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Cắt text nếu quá dài
function truncate(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  while (ctx.measureText(text + '…').width > maxW && text.length > 0) text = text.slice(0, -1);
  return text + '…';
}

/**
 * Tạo rank card PNG
 * @param {Object} opts
 * @param {string} opts.username
 * @param {string} opts.avatarURL
 * @param {number} opts.level
 * @param {number} opts.rank
 * @param {number} opts.totalRank
 * @param {number} opts.xpCurrent   - XP trong level hiện tại
 * @param {number} opts.xpNeeded    - XP cần để lên level tiếp
 * @param {number} opts.totalXP     - Tổng XP tích lũy
 * @param {number} opts.totalMessages
 * @param {string|null} opts.bgPath - Đường dẫn ảnh nền (null = dùng gradient)
 * @returns {Buffer} PNG buffer
 */
async function generateRankCard({ username, avatarURL, level, rank, totalRank, xpCurrent, xpNeeded, totalXP, totalMessages, bgPath }) {
  const W = 800, H = 250;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // ── Background ──
  let bgLoaded = false;
  if (bgPath) {
    try {
      const fs = require('fs');
      if (fs.existsSync(bgPath)) {
        const bg = await loadImage(bgPath);
        ctx.drawImage(bg, 0, 0, W, H);
        // overlay tối để chữ dễ đọc
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);
        bgLoaded = true;
      }
    } catch {}
  }
  if (!bgLoaded) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0,   '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1,   '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Viền ngoài ──
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth   = 2;
  roundRect(ctx, 4, 4, W - 8, H - 8, 20);
  ctx.stroke();

  // ── Avatar ──
  const AV_SIZE = 170, AV_X = 35, AV_Y = (H - AV_SIZE) / 2;
  const CX = AV_X + AV_SIZE / 2, CY = AV_Y + AV_SIZE / 2;

  // Vòng nền avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, AV_SIZE / 2 + 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.restore();

  // Clip avatar tròn
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, AV_SIZE / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  try {
    const avatar = await loadImage(avatarURL + '?size=256');
    ctx.drawImage(avatar, AV_X, AV_Y, AV_SIZE, AV_SIZE);
  } catch {
    ctx.fillStyle = '#5865F2';
    ctx.fillRect(AV_X, AV_Y, AV_SIZE, AV_SIZE);
  }
  ctx.restore();

  // ── Vòng XP tiến độ quanh avatar ──
  const RING_R  = AV_SIZE / 2 + 12;
  const progress = Math.min(xpCurrent / xpNeeded, 1);

  // Nền vòng
  ctx.beginPath();
  ctx.arc(CX, CY, RING_R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth   = 7;
  ctx.stroke();

  // Tiến độ
  if (progress > 0) {
    ctx.beginPath();
    ctx.arc(CX, CY, RING_R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    const ringGrad = ctx.createLinearGradient(CX - RING_R, CY, CX + RING_R, CY);
    ringGrad.addColorStop(0, '#a855f7');
    ringGrad.addColorStop(1, '#06b6d4');
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth   = 7;
    ctx.lineCap     = 'round';
    ctx.stroke();
  }

  // ── Text bên phải ──
  const TX = AV_X + AV_SIZE + 38;

  // Username
  ctx.font      = 'bold 34px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(truncate(ctx, username, 370), TX, 65);

  // Subtitle
  ctx.font      = '17px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('An Bot User', TX, 90);

  // Stats dòng 1
  ctx.font      = 'bold 20px sans-serif';
  ctx.fillStyle = '#a855f7';
  ctx.fillText(`LVL ${level}`, TX, 132);

  ctx.font      = '17px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(`Rank: #${rank} / ${totalRank}`, TX + 90, 132);

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(`💬 ${totalMessages} tin nhắn`, TX + 290, 132);

  // XP text
  ctx.font      = '15px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(`XP: ${xpCurrent.toLocaleString()} / ${xpNeeded.toLocaleString()}`, TX, 158);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(`Tổng: ${totalXP.toLocaleString()} XP`, TX + 230, 158);

  // ── Thanh XP ngang ──
  const BAR_X = TX, BAR_Y = 174, BAR_W = 530, BAR_H = 22, BAR_R = 11;
  const fillW = Math.max(BAR_R * 2, BAR_W * progress);

  // Nền
  roundRect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, BAR_R);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fill();

  // Fill
  roundRect(ctx, BAR_X, BAR_Y, fillW, BAR_H, BAR_R);
  const barGrad = ctx.createLinearGradient(BAR_X, 0, BAR_X + BAR_W, 0);
  barGrad.addColorStop(0, '#a855f7');
  barGrad.addColorStop(1, '#06b6d4');
  ctx.fillStyle = barGrad;
  ctx.fill();

  // % label
  ctx.font        = 'bold 12px sans-serif';
  ctx.fillStyle   = '#ffffff';
  ctx.textAlign   = 'center';
  ctx.fillText(`${Math.floor(progress * 100)}%`, BAR_X + fillW / 2, BAR_Y + 15);
  ctx.textAlign   = 'left';

  // ── Level badge góc phải ──
  const BD_X = W - 82, BD_Y = 12, BD_W = 68, BD_H = 28;
  roundRect(ctx, BD_X, BD_Y, BD_W, BD_H, 14);
  ctx.fillStyle = 'rgba(168,85,247,0.85)';
  ctx.fill();
  ctx.font        = 'bold 14px sans-serif';
  ctx.fillStyle   = '#ffffff';
  ctx.textAlign   = 'center';
  ctx.fillText(`Lv.${level}`, BD_X + BD_W / 2, BD_Y + 19);
  ctx.textAlign   = 'left';

  return canvas.toBuffer('image/png');
}

module.exports = { generateRankCard };

