// =============================================
// index.js — Entry point chính
// =============================================

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');

const config = require('./config');
const { commands }                         = require('./commands/definitions');
const { handleSlashCommand, handleButton } = require('./commands/handlers');
const { handleXP }                         = require('./handlers/xpHandler');
const { handlePrefix }                     = require('./handlers/prefixHandler');
const {
  sendBackupToChannel,
  saveLocalBackup,
  loadStartupBackup,
  startAutoBackup,
} = require('./utils/backup');

// ── Express (UptimeRobot keep-alive) ─────────
const app = express();
app.get('/', (req, res) => res.send('✅ Bot đang chạy!'));
app.listen(3000, () => console.log('[Web] Server chạy tại port 3000'));

// ── Load backup khi khởi động ─────────────────
const loaded = loadStartupBackup();
if (loaded) console.log('[Bot] Đã khôi phục data từ startup backup!');
else        console.log('[Bot] Không có startup backup, bắt đầu fresh.');

// ── Discord Client ────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ── Ready ─────────────────────────────────────
client.once('ready', async () => {
  console.log(`[Bot] Online: ${client.user.tag}`);

  // Đăng ký slash commands
  try {
    const rest = new REST({ version: '10' }).setToken(config.TOKEN);
    await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });
    console.log('[Bot] Đã đăng ký slash commands!');
  } catch (err) { console.error('[Bot] Lỗi đăng ký lệnh:', err.message); }

  // Gửi backup vào kênh lúc startup (báo hiệu bot đã online)
  await sendBackupToChannel(client, 'Startup');

  // Khởi động auto backup mỗi X giờ
  startAutoBackup(client);
});

// ── Interaction ───────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton())           return handleButton(interaction);
  if (interaction.isChatInputCommand()) return handleSlashCommand(interaction);
});

// ── Message ───────────────────────────────────
client.on('messageCreate', async (message) => {
  await handleXP(message);
  await handlePrefix(message);
});

// ── Graceful shutdown ─────────────────────────
async function gracefulShutdown(signal) {
  console.log(`\n[Bot] Nhận ${signal}, đang backup...`);
  try {
    saveLocalBackup();
    await sendBackupToChannel(client, 'Shutdown');
    console.log('[Bot] Backup xong! Tắt.');
  } catch (e) { console.error('[Bot] Lỗi backup khi tắt:', e.message); }
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// ── Login ─────────────────────────────────────
client.login(config.TOKEN);
