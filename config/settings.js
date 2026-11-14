import 'dotenv/config';
const digits = value => String(value || '').replace(/\D/g, '');
export const config = {
  name: process.env.BOT_NAME || 'Anime Bot',
  owner: digits(process.env.OWNER_NUMBER || '201032219184'),
  pairingNumber: digits(process.env.PAIRING_NUMBER || '201154684341'),
  timezone: process.env.TIMEZONE || 'Africa/Cairo',
  prefix: '.'
};
export const ranks = [
  'الإمبراطور','نائب الإمبراطور','الإمبراطور الأعلى','الإمبراطور الأعظم',
  'الإمبراطور الأسطوري','الإمبراطور الملكي','الإمبراطور الذهبي','الأسطورة',
  'الملك','الأمير','القائد','الجنرال','المحارب','الفارس','النخبة','المحترف','الخبير','المبتدئ'
];
