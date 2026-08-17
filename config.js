// =============================================
// config.js — Toàn bộ cấu hình bot ở đây
// =============================================

module.exports = {
  // ── Bot credentials ────────────────────────
  TOKEN:     process.env.TOKEN     || 'YOUR_BOT_TOKEN',
  CLIENT_ID: process.env.CLIENT_ID || 'YOUR_CLIENT_ID',

  // ── Backup ────────────────────────────────
  // ID kênh Discord để bot gửi file backup JSON vào (VD: #bot-backup)
  BACKUP_CHANNEL_ID: process.env.BACKUP_CHANNEL_ID || '1477332851715215610',

  // ID admin (dùng để check quyền /database /restore)
  ADMIN_IDS: [
    '1100660298073002004',
    // 'ID_ADMIN_2', // thêm nếu cần
  ],

  // Tự động backup mỗi X giờ (0 = tắt)
  AUTO_BACKUP_HOURS: 6,

  // ── XP ────────────────────────────────────
  XP_PER_MESSAGE: { min: 15, max: 25 },
  XP_COOLDOWN_MS: 1 * 1000, // 60 giây cooldown

  // Thưởng role khi đạt level
  // Ví dụ: { 5: 'Member', 10: 'Active', 20: 'Legend' }
  LEVEL_ROLE_REWARDS: {},
};
