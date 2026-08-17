// =============================================
// handlers/prefixHandler.js — Xử lý prefix commands (.rank .top ...)
// =============================================

const { EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('path');

const { isAdmin, loadXP, saveXP, getUser, getUserBG, setUserBG, deleteUserBG, BG_DIR } = require('../utils/db');
const { calcLevel, xpForLevel, xpInCurrentLevel } = require('../utils/xp');
const { parseTime, formatTime, downloadFile }      = require('../utils/helpers');
const { generateRankCard }   = require('../utils/rankCard');

async function handlePrefix(message) {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();
  const member  = message.member;
  const guild   = message.guild;
  const channel = message.channel;
  const author  = message.author;

  // ── .name ──────────────────────────────────
  if (content.startsWith('.name ')) {
    const newName = content.slice(6).trim();
    if (!newName) return message.reply('❌ VD: `.name TênMới`');
    if (newName.length > 32) return message.reply('❌ Tên quá dài! Tối đa 32 ký tự.');
    try { await member.setNickname(newName); message.reply(`✅ Đã đổi nickname thành **${newName}**!`); }
    catch { message.reply('❌ Bot cần role cao hơn bạn.'); }
    return;
  }

  // ── .lock ───────────────────────────────────
  if (content === '.lock') {
    if (!isAdmin(author.id) && !member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply('❌ Không có quyền khóa kênh!');
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false, AddReactions: false, SendMessagesInThreads: false });
      channel.send({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('🔒 Kênh đã bị khóa').setDescription(`Khóa bởi ${author}`).setTimestamp()] });
    } catch (err) { message.reply(`❌ Lỗi: ${err.message}`); }
    return;
  }

  // ── .unlock ─────────────────────────────────
  if (content === '.unlock') {
    if (!isAdmin(author.id) && !member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply('❌ Không có quyền mở khóa!');
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null, AddReactions: null, SendMessagesInThreads: null });
      channel.send({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle('🔓 Kênh đã mở khóa').setDescription(`Mở bởi ${author}`).setTimestamp()] });
    } catch (err) { message.reply(`❌ Lỗi: ${err.message}`); }
    return;
  }

  // ── .mute ───────────────────────────────────
  if (content.startsWith('.mute ')) {
    if (!isAdmin(author.id) && !member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply('❌ Không có quyền mute!');
    const args = content.split(/\s+/);
    const mid  = args[1]?.replace(/[<@!>]/g,'');
    const ms   = parseTime(args[2]);
    const ly   = args.slice(3).join(' ') || 'Không có lý do';
    if (!mid || !ms) return message.reply('❌ Cú pháp: `.mute @user [time] [lý do]`\nVD: `.mute @user 10m Spam`');
    if (ms > 28*24*60*60*1000) return message.reply('❌ Tối đa 28 ngày!');
    try {
      const tm = await guild.members.fetch(mid).catch(()=>null);
      if (!tm) return message.reply('❌ Không tìm thấy user!');
      await tm.timeout(ms, ly);
      message.reply({ embeds: [new EmbedBuilder().setColor(0xFF6600).setTitle('🔇 Đã Mute').addFields({name:'👤',value:`${tm.user}`,inline:true},{name:'⏱️',value:formatTime(ms),inline:true},{name:'📝 Lý do',value:ly},{name:'🔓 Hết lúc',value:`<t:${Math.floor((Date.now()+ms)/1000)}:F>`}).setFooter({text:`Bởi ${author.tag}`}).setTimestamp()] });
    } catch (err) { message.reply(`❌ Lỗi: ${err.message}`); }
    return;
  }

  // ── .unmute ─────────────────────────────────
  if (content.startsWith('.unmute ')) {
    if (!isAdmin(author.id) && !member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply('❌ Không có quyền unmute!');
    const mid = content.split(/\s+/)[1]?.replace(/[<@!>]/g,'');
    if (!mid) return message.reply('❌ Cú pháp: `.unmute @user`');
    try {
      const tm = await guild.members.fetch(mid).catch(()=>null);
      if (!tm) return message.reply('❌ Không tìm thấy user!');
      if (!tm.communicationDisabledUntil) return message.reply(`❌ **${tm.user.username}** không bị mute!`);
      await tm.timeout(null);
      message.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle('🔊 Đã Unmute').setDescription(`${tm.user} được gỡ mute bởi ${author}`).setTimestamp()] });
    } catch (err) { message.reply(`❌ Lỗi: ${err.message}`); }
    return;
  }

  // ── .rank ────────────────────────────────────
  if (content === '.rank' || content.startsWith('.rank ')) {
    let tm = member;
    const mid = content.split(/\s+/)[1]?.replace(/[<@!>]/g,'');
    if (mid) tm = await guild.members.fetch(mid).catch(()=>null) || member;
    const tu = tm.user;

    const db = loadXP(), data = getUser(db, guild.id, tu.id);
    const level = calcLevel(data.xp);
    const xpNeeded = xpForLevel(level), xpCurrent = xpInCurrentLevel(data.xp, level);
    const sorted = Object.entries(db[guild.id]||{}).map(([id,d])=>({id,xp:d.xp||0})).sort((a,b)=>b.xp-a.xp);
    const rankPos = sorted.findIndex(e=>e.id===tu.id)+1;
    const bgPath  = getUserBG(guild.id, tu.id);

    const loading = await message.reply('⏳ Đang tạo rank card...');
    try {
      const buf = await generateRankCard({ username: tm.displayName||tu.username, avatarURL: tu.displayAvatarURL({extension:'png'}), level, rank: rankPos, totalRank: sorted.length, xpCurrent, xpNeeded, totalXP: data.xp, totalMessages: data.totalMessages||0, bgPath });
      await loading.delete().catch(()=>{});
      message.reply({ files: [new AttachmentBuilder(buf, {name:'rank.png'})] });
    } catch (err) {
      await loading.delete().catch(()=>{});
      message.reply(`❌ Lỗi tạo rank card: ${err.message}`);
    }
    return;
  }

  // ── .top ─────────────────────────────────────
  if (content === '.top' || content.startsWith('.top ')) {
    const page = (parseInt(content.split(/\s+/)[1])||1)-1;
    const db = loadXP(), gData = db[guild.id]||{};
    const sorted = Object.entries(gData).map(([id,d])=>({id,xp:d.xp||0,level:calcLevel(d.xp||0)})).sort((a,b)=>b.xp-a.xp);
    if (!sorted.length) return message.reply('❌ Chưa có ai có XP!');
    const total=Math.ceil(sorted.length/10),pd=sorted.slice(page*10,(page+1)*10);
    if (!pd.length) return message.reply(`❌ Không có dữ liệu trang ${page+1}!`);
    const medals=['🥇','🥈','🥉'];
    const lines=await Promise.all(pd.map(async(e,i)=>{const gr=page*10+i+1,medal=medals[gr-1]||`**#${gr}**`;let name=`<@${e.id}>`;try{const m=await guild.members.fetch(e.id).catch(()=>null);if(m)name=m.displayName||m.user.username;}catch{}return`${medal} **${name}** — Lv.**${e.level}** | **${e.xp.toLocaleString()}** XP`;}));
    message.reply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle(`🏆 Bảng Xếp Hạng — ${guild.name}`).setDescription(lines.join('\n')).setFooter({text:`Trang ${page+1}/${total} • ${sorted.length} thành viên`}).setTimestamp()] });
    return;
  }

  // ── .setbg ───────────────────────────────────
  if (content === '.setbg' || content.startsWith('.setbg')) {
    const att = message.attachments.first();
    if (!att) return message.reply('❌ Hãy đính kèm ảnh cùng lệnh `.setbg`!');
    if (!['image/jpeg','image/jpg','image/png','image/webp','image/gif'].includes(att.contentType))
      return message.reply('❌ Chỉ chấp nhận JPG, PNG, WebP, GIF!');
    if (att.size > 8*1024*1024) return message.reply('❌ Ảnh quá lớn! Tối đa 8MB.');

    const loading = await message.reply('⏳ Đang tải ảnh...');
    try {
      const ext = att.contentType.includes('png')?'png':att.contentType.includes('gif')?'gif':att.contentType.includes('webp')?'webp':'jpg';
      const fp  = path.join(BG_DIR, `${guild.id}_${author.id}.${ext}`);
      await downloadFile(att.url, fp);
      setUserBG(guild.id, author.id, fp);
      await loading.delete().catch(()=>{});
      message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('🖼️ Đã cập nhật ảnh nền!').setDescription('Dùng `.rank` để xem!').setThumbnail(att.url).setFooter({text:'Dùng .resetbg để xóa'}).setTimestamp()] });
    } catch (err) { await loading.delete().catch(()=>{}); message.reply(`❌ Lỗi: ${err.message}`); }
    return;
  }

  // ── .resetbg ─────────────────────────────────
  if (content === '.resetbg') {
    const bgPath = getUserBG(guild.id, author.id);
    if (!bgPath) return message.reply('❌ Bạn chưa có ảnh nền tùy chỉnh!');
    deleteUserBG(guild.id, author.id);
    message.reply({ embeds: [new EmbedBuilder().setColor(0xFF6600).setTitle('🔄 Đã xóa ảnh nền').setDescription('Dùng `.setbg` để đặt ảnh mới!').setTimestamp()] });
    return;
  }
}

module.exports = { handlePrefix };

