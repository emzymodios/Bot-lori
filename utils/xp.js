// =============================================
// utils/xp.js — Công thức tính XP / Level
// =============================================

// XP cần để lên từ level N → N+1 (công thức MEE6)
function xpForLevel(level) {
  return 5 * (level ** 2) + 100 * level + 1000;
}

// Tổng XP tích lũy để đạt level N
function totalXPForLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i);
  return total;
}

// Tính level hiện tại từ tổng XP
function calcLevel(totalXP) {
  let level = 0;
  while (totalXP >= totalXPForLevel(level + 1)) level++;
  return level;
}

// XP đã tích lũy trong level hiện tại (để tính thanh progress)
function xpInCurrentLevel(totalXP, level) {
  return totalXP - totalXPForLevel(level);
}

module.exports = { xpForLevel, totalXPForLevel, calcLevel, xpInCurrentLevel };
