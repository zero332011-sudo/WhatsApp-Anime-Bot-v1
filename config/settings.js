import 'dotenv/config';
const digits = value => String(value || '').replace(/\D/g, '');
export const config = {
  name: process.env.BOT_NAME || 'Anime Bot',
  owner: digits(process.env.OWNER_NUMBER),
  pairingNumber: digits(process.env.PAIRING_NUMBER),
  timezone: process.env.TIMEZONE || 'Africa/Cairo',
  prefix: '.'
};
export const ranks = [
  'الإمبراطور','نائب الإمبراطور','الإمبراطور الأعلى','الإمبراطور الأعظم',
  'الإمبراطور الأسطوري','الإمبراطور الملكي','الإمبراطور الذهبي','الأسطورة',
  'الملك','الأمير','القائد','الجنرال','المحارب','الفارس','النخبة','المحترف','الخبير','المبتدئ'
];
