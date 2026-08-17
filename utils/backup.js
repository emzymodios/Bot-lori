// =============================================
// utils/backup.js — Hệ thống backup data
// =============================================

const fs   = require('fs');
const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { exportAllData, importAllData }    = require('./db');
const config = require('../config');

// ─── Build buffer JSON từ data hiện tại ──────
function buildBackupBuffer() {
  const data = exportAllData();
  return {
    data,
    buffer: Buffer.from(JSON.stringify(data, null, 2), 'utf8'),
  };
}

// ─── Gửi backup vào kênh Discord ─────────────
async function sendBackupToChannel(client, reason = 'Manual') {
  if (!config.BACKUP_CHANNEL_ID || config.BACKUP_CHANNEL_ID === 'ID_KENH_BACKUP') {
    console.warn('[Backup] Chưa cấu hình BACKUP_CHANNEL_ID trong config.js!');
    return null;
  }

  try {
    const { data, buffer } = buildBackupBuffer();

    const guildCount = Object.keys(data.xp || {}).length;
    const userCount  = Object.values(data.xp || {}).reduce((s, g) => s + Object.keys(g).length, 0);
    const bgCount    = Object.keys(data.backgrounds || {}).length;
    const sizeKB     = (buffer.byteLength / 1024).toFixed(1);

    const colorMap   = { Shutdown: 0xFF6600, Auto: 0x3498db, Startup: 0x2ecc71, Manual: 0x5865F2 };
    const iconMap    = { Shutdown: '🔴', Auto: '🔵', Startup: '🟢', Manual: '💾' };

    const embed = new EmbedBuilder()
      .setColor(colorMap[reason] || 0x5865F2)
      .setTitle(`${iconMap[reason] || '💾'} Backup — ${reason}`)
      .setDescription('File JSON chứa toàn bộ XP + backgrounds.\nDùng `/restore` để khôi phục khi cần.')
      .addFields(
        { name: '🌐 Servers',     value: `**${guildCount}**`,  inline: true },
        { name: '👥 Users',       value: `**${userCount}**`,   inline: true },
        { name: '🖼️ Backgrounds', value: `**${bgCount}**`,     inline: true },
        { name: '📦 Kích thước',  value: `**${sizeKB} KB**`,   inline: true },
        { name: '🕐 Thời gian',   value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      )
      .setFooter({ text: 'Giữ file này để restore. Dùng /restore + đính kèm file.' })
      .setTimestamp();

    const fileName   = `backup_${reason.toLowerCase()}_${Date.now()}.json`;
    const attachment = new AttachmentBuilder(buffer, { name: fileName });

    const channel = await client.channels.fetch(config.BACKUP_CHANNEL_ID);
    await channel.send({ embeds: [embed], files: [attachment] });

    console.log(`[Backup] ${reason} → #${channel.name} — ${userCount} users, ${sizeKB}KB`);
    return { guildCount, userCount, bgCount, sizeKB };
  } catch (err) {
    console.error('[Backup] Lỗi gửi vào kênh:', err.message);
    return null;
  }
}

// ─── Lưu backup cục bộ (dùng khi restart) ────
function saveLocalBackup() {
  try {
    const { buffer } = buildBackupBuffer();
    const savePath   = path.join(__dirname, '..', 'data', 'backup_startup.json');
    fs.writeFileSync(savePath, buffer);
    console.log('[Backup] Đã lưu local backup.');
  } catch (err) {
    console.error('[Backup] Lỗi lưu local:', err.message);
  }
}

// ─── Load backup khi khởi động ───────────────
// Nếu data/ trống sau Render redeploy → load từ backup_startup.json
function loadStartupBackup() {
  const backupPath = path.join(__dirname, '..', 'data', 'backup_startup.json');
  if (!fs.existsSync(backupPath)) return false;
  try {
    const raw  = fs.readFileSync(backupPath, 'utf8');
    const data = JSON.parse(raw);
    importAllData(data);
    const userCount = Object.values(data.xp || {}).reduce((s, g) => s + Object.keys(g).length, 0);
    console.log(`[Backup] Loaded startup backup — ${userCount} users`);
    return true;
  } catch (err) {
    console.error('[Backup] Lỗi load startup backup:', err.message);
    return false;
  }
}

// ─── Restore từ JSON buffer ───────────────────
function restoreFromBuffer(buffer) {
  const raw  = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : buffer;
  const data = JSON.parse(raw);
  if (!data.xp && !data.backgrounds) {
    throw new Error('File không hợp lệ! Thiếu trường xp hoặc backgrounds.');
  }
  importAllData(data);
  return data;
}

// ─── Auto backup theo interval ────────────────
function startAutoBackup(client) {
  const hours = config.AUTO_BACKUP_HOURS;
  if (!hours || hours <= 0) return;

  setInterval(async () => {
    saveLocalBackup();
    await sendBackupToChannel(client, 'Auto');
  }, hours * 60 * 60 * 1000);

  console.log(`[Backup] Auto backup mỗi ${hours} giờ`);
}

module.exports = {
  sendBackupToChannel,
  saveLocalBackup,
  loadStartupBackup,
  restoreFromBuffer,
  startAutoBackup,
};

