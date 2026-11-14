import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import 'dotenv/config';
import { messageHandler } from './handlers/messageHandler.js';
import { config } from './config/settings.js';
import { startPrayerSystem } from './system/prayer.js';

let starting = false;
let prayerStarted = false;

async function startBot() {
  if (starting) return;
  starting = true;
  if (!config.pairingNumber) throw new Error('ضع PAIRING_NUMBER في متغيرات البيئة.');
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
  const sock = makeWASocket({
    auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false,
    markOnlineOnConnect: false, syncFullHistory: false, browser: ['Anime Bot', 'Chrome', '1.0.0']
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', update => messageHandler(sock, update));
  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log('✅ تم الاتصال بواتساب');
      if (!prayerStarted) { prayerStarted = true; startPrayerSystem(sock); }
    }
    if (connection === 'close') {
      starting = false;
      prayerStarted = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log('انقطع الاتصال، إعادة المحاولة بعد 5 ثوانٍ');
        setTimeout(() => startBot().catch(console.error), 5000);
      } else console.log('تم تسجيل الخروج؛ أعد ربط الجهاز.');
    }
  });
  if (!state.creds.registered) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const code = await sock.requestPairingCode(config.pairingNumber);
    console.log('🔐 رمز الربط:', code);
    console.log('واتساب > الأجهزة المرتبطة > ربط جهاز برقم الهاتف');
  }
}
startBot().catch(error => { console.error(error); process.exitCode = 1; });
