// =============================================
// utils/db.js — Đọc/ghi JSON database
// =============================================

const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const XP_PATH = path.join(ROOT, 'data', 'xp.json');
const BG_PATH = path.join(ROOT, 'data', 'backgrounds.json');
const BG_DIR  = path.join(ROOT, 'data', 'bg_images');

// Tạo thư mục data nếu chưa có
if (!fs.existsSync(path.join(ROOT, 'data')))  fs.mkdirSync(path.join(ROOT, 'data'));
if (!fs.existsSync(BG_DIR))                   fs.mkdirSync(BG_DIR);

// ─── Generic helpers ───────────────────────
function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return {}; }
}
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ─── XP ────────────────────────────────────
function loadXP()   { return readJSON(XP_PATH); }
function saveXP(db) { writeJSON(XP_PATH, db); }

function getUser(db, guildId, userId) {
  if (!db[guildId])         db[guildId] = {};
  if (!db[guildId][userId]) db[guildId][userId] = { xp: 0, level: 0, totalMessages: 0, lastXP: 0 };
  return db[guildId][userId];
}

// ─── Background ────────────────────────────
function loadBG()   { return readJSON(BG_PATH); }
function saveBG(db) { writeJSON(BG_PATH, db); }

function getUserBG(guildId, userId) {
  return loadBG()[`${guildId}_${userId}`] || null;
}
function setUserBG(guildId, userId, filePath) {
  const db = loadBG();
  db[`${guildId}_${userId}`] = filePath;
  saveBG(db);
}
function deleteUserBG(guildId, userId) {
  const db  = loadBG();
  const key = `${guildId}_${userId}`;
  const old = db[key];
  if (old) { try { fs.unlinkSync(old); } catch {} }
  delete db[key];
  saveBG(db);
}

// ─── Admin — đọc từ config.js ──────────────
function isAdmin(userId) {
  const config = require('../config');
  return (config.ADMIN_IDS || []).includes(userId);
}

// ─── Export/Import toàn bộ data ────────────
function exportAllData() {
  return {
    exportedAt: new Date().toISOString(),
    xp: loadXP(),
    backgrounds: loadBG(),
  };
}
function importAllData(data) {
  if (data.xp)          saveXP(data.xp);
  if (data.backgrounds) saveBG(data.backgrounds);
}

module.exports = {
  XP_PATH, BG_PATH, BG_DIR,
  loadXP, saveXP, getUser,
  loadBG, saveBG, getUserBG, setUserBG, deleteUserBG,
  isAdmin,
  exportAllData, importAllData,
};
