// =============================================
// handlers/xpHandler.js — Xử lý XP khi nhắn tin
// =============================================

const { EmbedBuilder } = require('discord.js');
const { loadXP, saveXP, getUser } = require('../utils/db');
const { calcLevel, xpForLevel }   = require('../utils/xp');
const config = require('../config');

async function handleXP(message) {
  if (message.author.bot || !message.guild) return;

  const db   = loadXP();
  const data = getUser(db, message.guild.id, message.author.id);
  const now  = Date.now();

  // Cooldown
  if (now - data.lastXP < config.XP_COOLDOWN_MS) return;

  const { min, max } = config.XP_PER_MESSAGE;
  const xpGain  = Math.floor(Math.random() * (max - min + 1)) + min;
  const oldLevel = calcLevel(data.xp);

  data.xp           += xpGain;
  data.totalMessages = (data.totalMessages || 0) + 1;
  data.lastXP        = now;

  const newLevel = calcLevel(data.xp);
  saveXP(db);

  // Lên level!
  if (newLevel > oldLevel) {
    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle('🎉 Lên Level!')
      .setDescription(`Chúc mừng ${message.author}! Bạn vừa lên **Level ${newLevel}**! 🚀`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '⭐ Level mới', value: `**${newLevel}**`,               inline: true },
        { name: '✨ Tổng XP',   value: `**${data.xp.toLocaleString()}**`, inline: true },
        { name: '🎯 Level tiếp cần', value: `**${xpForLevel(newLevel).toLocaleString()}** XP`, inline: true },
      )
      .setTimestamp();

    message.channel.send({ embeds: [embed] })
      .then(m => setTimeout(() => m.delete().catch(() => {}), 15000))
      .catch(() => {});

    // Thưởng role
    const rewards = config.LEVEL_ROLE_REWARDS;
    if (rewards[newLevel]) {
      const role = message.guild.roles.cache.find(r => r.name === rewards[newLevel]);
      if (role && message.member && !message.member.roles.cache.has(role.id)) {
        message.member.roles.add(role).catch(() => {});
      }
    }
  }
}

module.exports = { handleXP };

