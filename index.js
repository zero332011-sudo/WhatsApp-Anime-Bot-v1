import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import 'dotenv/config';
import { messageHandler } from './handlers/messageHandler.js';
import { config } from './config/settings.js';
import { startPrayerSystem } from './system/prayer.js';

const WAIT_BEFORE_PAIRING_MS = 30_000;
const RECONNECT_DELAY_MS = 30_000;

let starting = false;
let prayerStarted = false;

async function startBot() {
  if (starting) return;
  starting = true;

  try {
    const phoneNumber = String(config.pairingNumber || '').replace(/\D/g, '');
    if (!phoneNumber || phoneNumber.length < 10) {
      throw new Error('رقم الربط غير صحيح. تأكد من PAIRING_NUMBER مع كود الدولة، أرقام فقط.');
    }

    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'warn' }),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000
    });

    let pairingCodeRequested = false;
    let socketClosed = false;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', update => {
      messageHandler(sock, update).catch(error => {
        console.error('خطأ في معالجة الرسالة:', error?.stack || error);
      });
    });

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr && !state.creds.registered && !pairingCodeRequested) {
        pairingCodeRequested = true;
        try {
          console.log('📲 واتساب بدأ الاتصال. انتظار 30 ثانية قبل طلب رمز الربط...');
          console.log('📞 رقم واتساب: +' + phoneNumber);
          await new Promise(resolve => setTimeout(resolve, WAIT_BEFORE_PAIRING_MS));

          if (socketClosed) {
            console.error('❌ الاتصال اتقفل أثناء انتظار الـ30 ثانية؛ لن نطلب الرمز من اتصال مغلق.');
            return;
          }

          const pairingCode = await sock.requestPairingCode(phoneNumber);

          console.log('\n========================================');
          console.log('🔐 رمز ربط واتساب: ' + pairingCode);
          console.log('افتح واتساب على الهاتف الذي يحمل الرقم أعلاه:');
          console.log('الأجهزة المرتبطة > ربط جهاز > الربط باستخدام رقم الهاتف');
          console.log('ثم أدخل الرمز الظاهر هنا كما هو.');
          console.log('⚠️ الرمز مؤقت وسري، ولا تشاركه مع أي شخص.');
          console.log('========================================\n');
        } catch (error) {
          console.error('❌ فشل طلب رمز الربط من واتساب:', {
            message: error?.message,
            statusCode: error?.output?.statusCode,
            stack: error?.stack
          });
        }
      }

      if (connection === 'open') {
        starting = false;
        console.log('✅ تم الاتصال بواتساب بنجاح');
        if (!prayerStarted) {
          prayerStarted = true;
          startPrayerSystem(sock);
        }
      }

      if (connection === 'close') {
        socketClosed = true;
        starting = false;
        prayerStarted = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const closeMessage = lastDisconnect?.error?.message;

        console.error('⚠️ اتصال واتساب اتقفل:', {
          statusCode,
          message: closeMessage || 'لا توجد تفاصيل إضافية'
        });

        if (statusCode !== DisconnectReason.loggedOut) {
          console.log('🔁 ستتم محاولة الاتصال من جديد بعد 30 ثانية...');
          setTimeout(() => {
            startBot().catch(error => {
              starting = false;
              console.error('فشل إعادة الاتصال:', error?.stack || error);
            });
          }, RECONNECT_DELAY_MS);
        } else {
          console.log('❌ تم تسجيل الخروج من واتساب؛ احذف جلسة الربط القديمة من ملفات الاستضافة ثم اربط الجهاز من جديد.');
        }
      }
    });

    if (state.creds.registered) {
      console.log('🔄 جلسة واتساب محفوظة؛ جاري الاتصال...');
    } else {
      console.log('⏳ جاري الاتصال بواتساب لطلب رمز الربط...');
    }
  } catch (error) {
    starting = false;
    console.error('❌ تعذر تشغيل البوت:', error?.stack || error);
    throw error;
  }
}

startBot().catch(error => {
  console.error('توقف تشغيل البوت:', error);
  process.exitCode = 1;
});
