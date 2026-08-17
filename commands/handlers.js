// =============================================
// commands/handlers.js — Xử lý slash commands
// =============================================

const {
  EmbedBuilder, AttachmentBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');

const { isAdmin, loadXP, saveXP, getUser, getUserBG, setUserBG, deleteUserBG } = require('../utils/db');
const { calcLevel, xpForLevel, xpInCurrentLevel } = require('../utils/xp');
const { parseTime, formatTime, downloadFile }      = require('../utils/helpers');
const { generateRankCard }   = require('../utils/rankCard');
const { sendBackupToChannel, restoreFromBuffer } = require('../utils/backup');
const path = require('path');
const { BG_DIR }  = require('../utils/db');

// ─── Router chính ────────────────────────────────────────
async function handleSlashCommand(interaction) {
  const { commandName, user, member, guild, channel } = interaction;

  switch (commandName) {

    // ════════════════════════════════════════
    case 'help': {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Danh sách lệnh Bot')
        .addFields(
          {
            name: '👤 Mọi người',
            value: [
              '`/rank [@user]` `.rank` — 🏆 Xem rank card',
              '`/top [trang]` `.top` — 🥇 Bảng xếp hạng',
              '`/setbg [ảnh]` `.setbg` — 🖼️ Đổi ảnh nền rank',
              '`/resetbg` `.resetbg` — 🔄 Xóa ảnh nền',
              '`.name [tên]` — ✏️ Đổi nickname',
            ].join('\n'),
          },
          {
            name: '🔐 Admin',
            value: [
              '`/lock` `/unlock` — 🔒 Khóa/mở kênh',
              '`/mute` `/unmute` — 🔇 Mute/unmute',
              '`/role` `/addroles` `/deleterole` `/addrole` — Role',
              '`/clear` — 🧹 Xóa tin nhắn',
              '`/setrole` — 🎭 Panel chọn role',
              '`/setxp` `/resetxp` — ✏️ Quản lý XP',
              '`/database` — 💾 Xem DB & tải backup',
              '`/restore` — 📥 Khôi phục từ backup',
            ].join('\n'),
          }
        )
        .setFooter({ text: '🔐 = Chỉ Admin' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ════════════════════════════════════════
    case 'lock': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.ManageChannels))
        return interaction.reply({ content: '❌ Bạn không có quyền khóa kênh!', ephemeral: true });
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false, AddReactions: false, SendMessagesInThreads: false });
        interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('🔒 Kênh đã bị khóa').setDescription(`Kênh **#${channel.name}** bị khóa bởi ${user}`).setTimestamp()] });
      } catch (err) { interaction.reply({ content: `❌ Lỗi: ${err.message}`, ephemeral: true }); }
      break;
    }

    case 'unlock': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.ManageChannels))
        return interaction.reply({ content: '❌ Bạn không có quyền!', ephemeral: true });
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null, AddReactions: null, SendMessagesInThreads: null });
        interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle('🔓 Kênh đã mở khóa').setDescription(`Kênh **#${channel.name}** được mở bởi ${user}`).setTimestamp()] });
      } catch (err) { interaction.reply({ content: `❌ Lỗi: ${err.message}`, ephemeral: true }); }
      break;
    }

    // ════════════════════════════════════════
    case 'clear': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.ManageMessages))
        return interaction.reply({ content: '❌ Không có quyền xóa tin nhắn!', ephemeral: true });
      try {
        await interaction.deferReply({ ephemeral: true });
        const msgs = await channel.messages.fetch({ limit: interaction.options.getInteger('soluong') });
        const del  = msgs.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
        if (!del.size) return interaction.editReply('❌ Không có tin nhắn nào xóa được!');
        await channel.bulkDelete(del, true);
        const reply = await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('🧹 Đã xóa tin nhắn').setDescription(`Đã xóa **${del.size}** tin nhắn trong **#${channel.name}**`).setTimestamp()], ephemeral: false });
        setTimeout(() => reply.delete().catch(() => {}), 5000);
      } catch (err) { try { interaction.editReply({ content: `❌ Lỗi: ${err.message}` }); } catch {} }
      break;
    }

    // ════════════════════════════════════════
    case 'mute': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.ModerateMembers))
        return interaction.reply({ content: '❌ Không có quyền mute!', ephemeral: true });
      const tu = interaction.options.getMember('user');
      const ms = parseTime(interaction.options.getString('time'));
      const ly = interaction.options.getString('lydo') || 'Không có lý do';
      if (!tu)  return interaction.reply({ content: '❌ Không tìm thấy user!', ephemeral: true });
      if (!ms)  return interaction.reply({ content: '❌ Thời gian không hợp lệ! VD: `10m`, `1h`, `2d`', ephemeral: true });
      if (ms > 28*24*60*60*1000) return interaction.reply({ content: '❌ Tối đa 28 ngày!', ephemeral: true });
      try {
        await tu.timeout(ms, ly);
        interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF6600).setTitle('🔇 Đã Mute').addFields({ name: '👤', value: `${tu.user}`, inline: true }, { name: '⏱️', value: formatTime(ms), inline: true }, { name: '📝 Lý do', value: ly }, { name: '🔓 Hết lúc', value: `<t:${Math.floor((Date.now()+ms)/1000)}:F>` }).setFooter({ text: `Bởi ${user.tag}` }).setTimestamp()] });
      } catch (err) { interaction.reply({ content: `❌ Lỗi: ${err.message}`, ephemeral: true }); }
      break;
    }

    case 'unmute': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.ModerateMembers))
        return interaction.reply({ content: '❌ Không có quyền unmute!', ephemeral: true });
      const tu = interaction.options.getMember('user');
      if (!tu) return interaction.reply({ content: '❌ Không tìm thấy user!', ephemeral: true });
      if (!tu.communicationDisabledUntil) return interaction.reply({ content: `❌ **${tu.user.username}** không bị mute!`, ephemeral: true });
      try { await tu.timeout(null); interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle('🔊 Đã Unmute').setDescription(`${tu.user} được gỡ mute bởi ${user}`).setTimestamp()] }); }
      catch (err) { interaction.reply({ content: `❌ Lỗi: ${err.message}`, ephemeral: true }); }
      break;
    }

    // ════════════════════════════════════════
    case 'role': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.reply({ content: '❌ Không có quyền thêm role!', ephemeral: true });
      const tu = interaction.options.getMember('user'), tr = interaction.options.getRole('role');
      if (!tu || !tr) return interaction.reply({ content: '❌ Không tìm thấy user/role!', ephemeral: true });
      if (tu.roles.cache.has(tr.id)) return interaction.reply({ content: `❌ User đã có role **${tr.name}**!`, ephemeral: true });
      try { await tu.roles.add(tr); interaction.reply({ embeds: [new EmbedBuilder().setColor(tr.color||0x5865F2).setTitle('✅ Đã thêm Role').setDescription(`Đã thêm **${tr.name}** cho ${tu.user}\nBởi: ${user}`).setTimestamp()] }); }
      catch (err) { interaction.reply({ content: `❌ Lỗi: ${err.message}`, ephemeral: true }); }
      break;
    }

    case 'addroles': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.reply({ content: '❌ Không có quyền!', ephemeral: true });
      const tu = interaction.options.getMember('user');
      if (!tu) return interaction.reply({ content: '❌ Không tìm thấy user!', ephemeral: true });
      const roles = []; for (let i=1;i<=5;i++){const r=interaction.options.getRole(`role${i}`);if(r)roles.push(r);}
      if (!roles.length) return interaction.reply({ content: '❌ Chưa chọn role!', ephemeral: true });
      await interaction.deferReply();
      const added=[],skipped=[],failed=[];
      for(const r of roles){if(tu.roles.cache.has(r.id))skipped.push(r.name);else{try{await tu.roles.add(r);added.push(r.name);}catch{failed.push(r.name);}}}
      const embed=new EmbedBuilder().setColor(0x5865F2).setTitle('➕ Kết quả thêm Role').setDescription(`Thành viên: ${tu.user}`).setTimestamp();
      if(added.length)  embed.addFields({name:'✅ Đã thêm',  value:added.map(r=>`**${r}**`).join(', ')});
      if(skipped.length)embed.addFields({name:'⏭️ Đã có',   value:skipped.map(r=>`**${r}**`).join(', ')});
      if(failed.length) embed.addFields({name:'❌ Thất bại', value:failed.map(r=>`**${r}**`).join(', ')});
      interaction.editReply({embeds:[embed]});
      break;
    }

    case 'deleterole': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.reply({ content: '❌ Không có quyền!', ephemeral: true });
      const tu=interaction.options.getMember('user'),tr=interaction.options.getRole('role');
      if(!tu||!tr)return interaction.reply({content:'❌ Không tìm thấy user/role!',ephemeral:true});
      if(!tu.roles.cache.has(tr.id))return interaction.reply({content:`❌ User không có role **${tr.name}**!`,ephemeral:true});
      try{await tu.roles.remove(tr);interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF6600).setTitle('🗑️ Đã xóa Role').setDescription(`Xóa **${tr.name}** khỏi ${tu.user}\nBởi: ${user}`).setTimestamp()]});}
      catch(err){interaction.reply({content:`❌ Lỗi: ${err.message}`,ephemeral:true});}
      break;
    }

    case 'addrole': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.reply({ content: '❌ Không có quyền!', ephemeral: true });
      const rn=interaction.options.getString('ten'),rc=interaction.options.getString('mau');
      if(!/^#([0-9A-Fa-f]{6})$/.test(rc))return interaction.reply({content:'❌ Màu không hợp lệ! VD: `#FF0000`',ephemeral:true});
      if(guild.roles.cache.find(r=>r.name.toLowerCase()===rn.toLowerCase()))return interaction.reply({content:`❌ Role **${rn}** đã tồn tại!`,ephemeral:true});
      try{const nr=await guild.roles.create({name:rn,color:rc,permissions:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory]});interaction.reply({embeds:[new EmbedBuilder().setColor(nr.color).setTitle('🎨 Đã tạo Role mới').addFields({name:'📛 Tên',value:nr.name,inline:true},{name:'🎨 Màu',value:rc,inline:true}).setTimestamp()]});}
      catch(err){interaction.reply({content:`❌ Lỗi: ${err.message}`,ephemeral:true});}
      break;
    }

    case 'setrole': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.reply({ content: '❌ Không có quyền!', ephemeral: true });
      const tieude=interaction.options.getString('tieude'),mota=interaction.options.getString('mota')||'';
      const pairs=[];for(let i=1;i<=5;i++){const r=interaction.options.getRole(`role${i}`),ic=interaction.options.getString(`icon${i}`);if(r&&ic)pairs.push({role:r,icon:ic});}
      if(!pairs.length)return interaction.reply({content:'❌ Cần ít nhất 1 cặp role + icon!',ephemeral:true});
      const embed=new EmbedBuilder().setColor(0x5865F2).setTitle(tieude).setDescription((mota?mota+'\n\n':'')+'**Click nút bên dưới để nhận/bỏ role:**\n'+pairs.map(p=>`${p.icon} → **${p.role.name}**`).join('\n')).setFooter({text:'Click lần nữa để bỏ role'}).setTimestamp();
      const row=new ActionRowBuilder();pairs.forEach(p=>row.addComponents(new ButtonBuilder().setCustomId(`setrole_${p.role.id}`).setLabel(p.role.name).setEmoji(p.icon).setStyle(ButtonStyle.Primary)));
      const tc=interaction.options.getChannel('kenh')||channel;
      try{await tc.send({embeds:[embed],components:[row]});await interaction.reply({content:tc.id!==channel.id?`✅ Đã gửi panel sang ${tc}!`:'✅ Đã tạo panel role!',ephemeral:true});}
      catch(err){interaction.reply({content:`❌ Lỗi: ${err.message}`,ephemeral:true});}
      break;
    }

    // ════════════════════════════════════════
    case 'rank': {
      await interaction.deferReply();
      const tm = interaction.options.getMember('user') || member;
      const tu = tm.user;
      const db = loadXP(), data = getUser(db, guild.id, tu.id);
      const level = calcLevel(data.xp);
      const xpNeeded = xpForLevel(level), xpCurrent = xpInCurrentLevel(data.xp, level);
      const sorted = Object.entries(db[guild.id]||{}).map(([id,d])=>({id,xp:d.xp||0})).sort((a,b)=>b.xp-a.xp);
      const rankPos = sorted.findIndex(e=>e.id===tu.id)+1;
      const bgPath  = getUserBG(guild.id, tu.id);
      try {
        const buf = await generateRankCard({ username: tm.displayName||tu.username, avatarURL: tu.displayAvatarURL({extension:'png'}), level, rank: rankPos, totalRank: sorted.length, xpCurrent, xpNeeded, totalXP: data.xp, totalMessages: data.totalMessages||0, bgPath });
        return interaction.editReply({ files: [new AttachmentBuilder(buf, {name:'rank.png'})] });
      } catch (err) { return interaction.editReply({ content: `❌ Lỗi tạo rank card: ${err.message}` }); }
    }

    // ════════════════════════════════════════
    case 'top': {
      const page = (interaction.options.getInteger('trang')||1)-1;
      const db   = loadXP(), gData = db[guild.id]||{};
      const sorted = Object.entries(gData).map(([id,d])=>({id,xp:d.xp||0,level:calcLevel(d.xp||0)})).sort((a,b)=>b.xp-a.xp);
      if (!sorted.length) return interaction.reply({content:'❌ Chưa có ai có XP!',ephemeral:true});
      const total=Math.ceil(sorted.length/10),pd=sorted.slice(page*10,(page+1)*10);
      if (!pd.length) return interaction.reply({content:`❌ Không có dữ liệu trang ${page+1}!`,ephemeral:true});
      const medals=['🥇','🥈','🥉'];
      const lines=await Promise.all(pd.map(async(e,i)=>{const gr=page*10+i+1,medal=medals[gr-1]||`**#${gr}**`;let name=`<@${e.id}>`;try{const m=await guild.members.fetch(e.id).catch(()=>null);if(m)name=m.displayName||m.user.username;}catch{}return`${medal} **${name}** — Lv.**${e.level}** | **${e.xp.toLocaleString()}** XP`;}));
      interaction.reply({embeds:[new EmbedBuilder().setColor(0xF1C40F).setTitle(`🏆 Bảng Xếp Hạng — ${guild.name}`).setDescription(lines.join('\n')).setFooter({text:`Trang ${page+1}/${total} • ${sorted.length} thành viên`}).setTimestamp()]});
      break;
    }

    // ════════════════════════════════════════
    case 'setbg': {
      await interaction.deferReply({ ephemeral: true });
      const att = interaction.options.getAttachment('anh');
      if (!['image/jpeg','image/jpg','image/png','image/webp','image/gif'].includes(att.contentType))
        return interaction.editReply({ content: '❌ Chỉ chấp nhận JPG, PNG, WebP, GIF!' });
      if (att.size > 8*1024*1024) return interaction.editReply({ content: '❌ Ảnh quá lớn! Tối đa 8MB.' });
      try {
        const ext = att.contentType.includes('png')?'png':att.contentType.includes('gif')?'gif':att.contentType.includes('webp')?'webp':'jpg';
        const fp  = path.join(BG_DIR, `${guild.id}_${user.id}.${ext}`);
        await downloadFile(att.url, fp);
        setUserBG(guild.id, user.id, fp);
        interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('🖼️ Đã cập nhật ảnh nền!').setDescription('Dùng `/rank` để xem thành quả!').setThumbnail(att.url).setFooter({text:'Dùng /resetbg để xóa'}).setTimestamp()] });
      } catch (err) { interaction.editReply({ content: `❌ Lỗi: ${err.message}` }); }
      break;
    }

    case 'resetbg': {
      const bgPath = getUserBG(guild.id, user.id);
      if (!bgPath) return interaction.reply({ content: '❌ Bạn chưa có ảnh nền tùy chỉnh!', ephemeral: true });
      deleteUserBG(guild.id, user.id);
      interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF6600).setTitle('🔄 Đã xóa ảnh nền').setDescription('Rank card sẽ dùng nền gradient mặc định.').setTimestamp()], ephemeral: true });
      break;
    }

    // ════════════════════════════════════════
    case 'setxp': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Không có quyền!', ephemeral: true });
      const tu=interaction.options.getMember('user'),newXP=interaction.options.getInteger('xp');
      if (!tu) return interaction.reply({ content: '❌ Không tìm thấy user!', ephemeral: true });
      const db=loadXP(),data=getUser(db,guild.id,tu.user.id);
      data.xp=newXP;saveXP(db);
      interaction.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle('✏️ Đã cập nhật XP').setDescription(`${tu.user} giờ có **${newXP.toLocaleString()}** XP (Level **${calcLevel(newXP)}**)\nBởi: ${user}`).setTimestamp()]});
      break;
    }

    case 'resetxp': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Không có quyền!', ephemeral: true });
      const tu=interaction.options.getMember('user');
      if (!tu) return interaction.reply({ content: '❌ Không tìm thấy user!', ephemeral: true });
      const db=loadXP();if(db[guild.id])delete db[guild.id][tu.user.id];saveXP(db);
      interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF6600).setTitle('🔄 Đã Reset XP').setDescription(`XP của ${tu.user} reset về **0**\nBởi: ${user}`).setTimestamp()]});
      break;
    }

    // ════════════════════════════════════════
    case 'database': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Không có quyền!', ephemeral: true });

      await interaction.deferReply({ ephemeral: true });

      try {
        const { exportAllData } = require('../utils/db');
        const fs = require('fs');
        const data = exportAllData();
        const json = JSON.stringify(data, null, 2);

        const guildCount = Object.keys(data.xp || {}).length;
        const userCount  = Object.values(data.xp || {}).reduce((s,g)=>s+Object.keys(g).length,0);
        const bgCount    = Object.keys(data.backgrounds || {}).length;
        const sizeKB     = (Buffer.byteLength(json,'utf8')/1024).toFixed(1);

        // Thống kê server hiện tại
        const gData  = data.xp?.[guild.id] || {};
        const users  = Object.values(gData);
        const totalXP = users.reduce((s,u)=>s+(u.xp||0),0);
        const topUser = Object.entries(gData).sort(([,a],[,b])=>b.xp-a.xp)[0];
        let topName = 'Chưa có';
        if (topUser) { try { const m = await guild.members.fetch(topUser[0]).catch(()=>null); topName = m ? (m.displayName||m.user.username) : `<@${topUser[0]}>`; } catch {} }

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('💾 Database Overview')
          .addFields(
            { name: '🌐 Tổng servers',  value: `**${guildCount}**`,           inline: true },
            { name: '👥 Tổng users',    value: `**${userCount}**`,            inline: true },
            { name: '🖼️ Backgrounds',   value: `**${bgCount}**`,              inline: true },
            { name: '📦 Kích thước',    value: `**${sizeKB} KB**`,            inline: true },
            { name: '─── Server này ───', value: '\u200b', inline: false },
            { name: '👤 Users có XP',   value: `**${users.length}**`,         inline: true },
            { name: '✨ Tổng XP',        value: `**${totalXP.toLocaleString()}**`, inline: true },
            { name: '🏆 Top 1',         value: topUser ? `**${topName}** (${topUser[1].xp?.toLocaleString()} XP)` : 'Chưa có', inline: false },
          )
          .setFooter({ text: 'File JSON đính kèm bên dưới' })
          .setTimestamp();

        // Gửi file JSON
        const tmpPath = path.join(__dirname, '..', 'data', '_db_export.json');
        fs.writeFileSync(tmpPath, json, 'utf8');
        const attachment = new AttachmentBuilder(tmpPath, { name: `database_${Date.now()}.json` });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        try { fs.unlinkSync(tmpPath); } catch {}
      } catch (err) { interaction.editReply({ content: `❌ Lỗi: ${err.message}` }); }
      break;
    }

    // ════════════════════════════════════════
    case 'restore': {
      if (!isAdmin(user.id) && !member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: '❌ Không có quyền!', ephemeral: true });

      await interaction.deferReply({ ephemeral: true });
      const att = interaction.options.getAttachment('file');

      if (!att.name.endsWith('.json'))
        return interaction.editReply({ content: '❌ Chỉ chấp nhận file `.json`!' });
      if (att.size > 10 * 1024 * 1024)
        return interaction.editReply({ content: '❌ File quá lớn! Tối đa 10MB.' });

      try {
        const tmpPath = path.join(__dirname, '..', 'data', '_restore_tmp.json');
        await downloadFile(att.url, tmpPath);
        const fs = require('fs');
        const raw = fs.readFileSync(tmpPath, 'utf8');
        fs.unlinkSync(tmpPath);

        const result = restoreFromBuffer(Buffer.from(raw));
        const userCount = Object.values(result.xp||{}).reduce((s,g)=>s+Object.keys(g).length,0);

        interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle('📥 Khôi phục thành công!').addFields({ name: '👥 Users', value: `**${userCount}**`, inline: true }, { name: '🖼️ Backgrounds', value: `**${Object.keys(result.backgrounds||{}).length}**`, inline: true }).setFooter({ text: `Restore bởi ${user.tag}` }).setTimestamp()] });
      } catch (err) { interaction.editReply({ content: `❌ Lỗi restore: ${err.message}` }); }
      break;
    }
  }
}

// ─── Button handler ──────────────────────────────────────
async function handleButton(interaction) {
  if (!interaction.customId.startsWith('setrole_')) return;
  try {
    const roleId = interaction.customId.replace('setrole_', '');
    const role   = interaction.guild.roles.cache.get(roleId);
    if (!role) return interaction.reply({ content: '❌ Role không tồn tại!', ephemeral: true });
    const member = interaction.member;
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(role);
      interaction.reply({ content: `✅ Đã bỏ role **${role.name}**!`, ephemeral: true });
    } else {
      await member.roles.add(role);
      interaction.reply({ content: `✅ Đã thêm role **${role.name}**!`, ephemeral: true });
    }
  } catch (err) { interaction.reply({ content: `❌ Lỗi: ${err.message}`, ephemeral: true }); }
}

module.exports = { handleSlashCommand, handleButton };

