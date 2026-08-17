// =============================================
// utils/helpers.js — Hàm tiện ích chung
// =============================================

// Parse chuỗi thời gian: "10m" → 600000ms
function parseTime(str) {
  const match = str?.match(/^(\d+)([smhdw])$/i);
  if (!match) return null;
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return parseInt(match[1]) * (map[match[2].toLowerCase()] || 0);
}

// Format ms → chuỗi dễ đọc
function formatTime(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60),
        h = Math.floor(m / 60),    d = Math.floor(h / 24);
  if (d > 0) return `${d} ngày`;
  if (h > 0) return `${h} giờ`;
  if (m > 0) return `${m} phút`;
  return `${s} giây`;
}

// Download ảnh từ URL về local path
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const fs     = require('fs');
    const https  = require('https');
    const http   = require('http');
    const client = url.startsWith('https') ? https : http;
    const file   = fs.createWriteStream(destPath);
    client.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

module.exports = { parseTime, formatTime, downloadFile };

