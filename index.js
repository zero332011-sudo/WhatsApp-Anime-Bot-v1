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

  try {
    if (!config.pairingNumber) {
      throw new Error('ضع PAIRING_NUMBER في متغيرات البيئة.');
    }

    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      browser: ['Anime Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', update => {
      messageHandler(sock, update).catch(error => console.error('خطأ في معالجة الرسالة:', error));
    });

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        starting = false;
        console.log('✅ تم الاتصال بواتساب بنجاح');
        if (!prayerStarted) {
          prayerStarted = true;
          startPrayerSystem(sock);
        }
      }

      if (connection === 'close') {
        starting = false;
        prayerStarted = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;

        if (statusCode !== DisconnectReason.loggedOut) {
          console.log('⚠️ انقطع الاتصال، ستتم إعادة المحاولة بعد 5 ثوانٍ');
          setTimeout(() => startBot().catch(error => {
            starting = false;
            console.error('فشل إعادة الاتصال:', error);
          }), 5000);
        } else {
          console.log('❌ تم تسجيل الخروج من واتساب؛ احذف جلسة الربط القديمة ثم اربط الجهاز من جديد.');
        }
      }
    });

    if (!state.creds.registered) {
      console.log('\n========================================');
      console.log('📲 جاري طلب كود ربط واتساب...');
      console.log('📞 رقم واتساب: +' + config.pairingNumber);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const pairingCode = await sock.requestPairingCode(config.pairingNumber);

      console.log('\n🔐 رسالة الربط:');
      console.log('كود ربط بوت Gojo الخاص بك هو: ' + pairingCode);
      console.log('\nطريقة إدخال الكود:');
      console.log('1) افتح واتساب على الهاتف الذي يحمل الرقم أعلاه.');
      console.log('2) افتح الأجهزة المرتبطة > ربط جهاز.');
      console.log('3) اختر الربط باستخدام رقم الهاتف.');
      console.log('4) أدخل الكود الظاهر أعلاه كما هو.');
      console.log('⚠️ الكود مؤقت وسري، ولا تشاركه مع أي شخص.');
      console.log('========================================\n');
    } else {
      console.log('🔄 جلسة واتساب محفوظة؛ جاري الاتصال...');
    }
  } catch (error) {
    starting = false;
    console.error('❌ تعذر تشغيل البوت أو طلب كود الربط:', error);
    throw error;
  }
}

startBot().catch(error => {
  console.error('توقف تشغيل البوت:', error);
  process.exitCode = 1;
});
