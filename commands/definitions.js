// =============================================
// commands/definitions.js — Định nghĩa slash commands
// =============================================

const { SlashCommandBuilder } = require('discord.js');

const commands = [
  // ── General ──────────────────────────────
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Xem danh sách lệnh'),

  // ── Moderation ───────────────────────────
  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Khóa kênh hiện tại (Admin)'),

  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Mở khóa kênh hiện tại (Admin)'),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Xóa tin nhắn trong kênh (Admin)')
    .addIntegerOption(o => o.setName('soluong').setDescription('Số tin nhắn (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),

  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute thành viên (Admin)')
    .addUserOption(o => o.setName('user').setDescription('User cần mute').setRequired(true))
    .addStringOption(o => o.setName('time').setDescription('Thời gian VD: 10m, 1h, 2d').setRequired(true))
    .addStringOption(o => o.setName('lydo').setDescription('Lý do').setRequired(false)),

  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Gỡ mute thành viên (Admin)')
    .addUserOption(o => o.setName('user').setDescription('User cần unmute').setRequired(true)),

  // ── Role ─────────────────────────────────
  new SlashCommandBuilder()
    .setName('role')
    .setDescription('Thêm 1 role cho user (Admin)')
    .addUserOption(o => o.setName('user').setDescription('Chọn user').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Chọn role').setRequired(true)),

  new SlashCommandBuilder()
    .setName('addroles')
    .setDescription('Thêm nhiều role cùng lúc (Admin)')
    .addUserOption(o => o.setName('user').setDescription('Chọn user').setRequired(true))
    .addRoleOption(o => o.setName('role1').setDescription('Role 1').setRequired(true))
    .addRoleOption(o => o.setName('role2').setDescription('Role 2').setRequired(false))
    .addRoleOption(o => o.setName('role3').setDescription('Role 3').setRequired(false))
    .addRoleOption(o => o.setName('role4').setDescription('Role 4').setRequired(false))
    .addRoleOption(o => o.setName('role5').setDescription('Role 5').setRequired(false)),

  new SlashCommandBuilder()
    .setName('deleterole')
    .setDescription('Xóa role khỏi user (Admin)')
    .addUserOption(o => o.setName('user').setDescription('Chọn user').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Chọn role').setRequired(true)),

  new SlashCommandBuilder()
    .setName('addrole')
    .setDescription('Tạo role mới trong server (Admin)')
    .addStringOption(o => o.setName('ten').setDescription('Tên role').setRequired(true))
    .addStringOption(o => o.setName('mau').setDescription('Màu hex VD: #FF0000').setRequired(true)),

  new SlashCommandBuilder()
    .setName('setrole')
    .setDescription('Tạo panel chọn role bằng nút bấm (Admin)')
    .addStringOption(o => o.setName('tieude').setDescription('Tiêu đề panel').setRequired(true))
    .addRoleOption(o => o.setName('role1').setDescription('Role 1').setRequired(true))
    .addStringOption(o => o.setName('icon1').setDescription('Emoji role 1').setRequired(true))
    .addRoleOption(o => o.setName('role2').setDescription('Role 2').setRequired(false))
    .addStringOption(o => o.setName('icon2').setDescription('Emoji role 2').setRequired(false))
    .addRoleOption(o => o.setName('role3').setDescription('Role 3').setRequired(false))
    .addStringOption(o => o.setName('icon3').setDescription('Emoji role 3').setRequired(false))
    .addRoleOption(o => o.setName('role4').setDescription('Role 4').setRequired(false))
    .addStringOption(o => o.setName('icon4').setDescription('Emoji role 4').setRequired(false))
    .addRoleOption(o => o.setName('role5').setDescription('Role 5').setRequired(false))
    .addStringOption(o => o.setName('icon5').setDescription('Emoji role 5').setRequired(false))
    .addChannelOption(o => o.setName('kenh').setDescription('Kênh gửi panel').setRequired(false))
    .addStringOption(o => o.setName('mota').setDescription('Mô tả thêm').setRequired(false)),

  // ── XP / Rank ────────────────────────────
  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Xem rank card của bạn hoặc người khác')
    .addUserOption(o => o.setName('user').setDescription('Xem rank của ai? (mặc định là bạn)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('top')
    .setDescription('Bảng xếp hạng XP server')
    .addIntegerOption(o => o.setName('trang').setDescription('Trang (10 người/trang)').setRequired(false).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('setbg')
    .setDescription('Đổi ảnh nền rank card của bạn')
    .addAttachmentOption(o => o.setName('anh').setDescription('Ảnh nền (JPG/PNG, tỉ lệ 16:9)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('resetbg')
    .setDescription('Xóa ảnh nền tùy chỉnh, về mặc định'),

  new SlashCommandBuilder()
    .setName('setxp')
    .setDescription('Đặt XP cho user (Admin)')
    .addUserOption(o => o.setName('user').setDescription('Chọn user').setRequired(true))
    .addIntegerOption(o => o.setName('xp').setDescription('Số XP').setRequired(true).setMinValue(0)),

  new SlashCommandBuilder()
    .setName('resetxp')
    .setDescription('Reset XP user về 0 (Admin)')
    .addUserOption(o => o.setName('user').setDescription('Chọn user').setRequired(true)),

  // ── Database / Backup ─────────────────────
  new SlashCommandBuilder()
    .setName('database')
    .setDescription('Xem thống kê & tải file backup JSON (Admin)'),

  new SlashCommandBuilder()
    .setName('restore')
    .setDescription('Khôi phục data từ file backup JSON (Admin)')
    .addAttachmentOption(o => o.setName('file').setDescription('File backup JSON').setRequired(true)),

].map(cmd => cmd.toJSON());

module.exports = { commands };
