import 'dotenv/config';
export const config = {
  name: process.env.BOT_NAME || 'Anime Bot',
  owner: (process.env.OWNER_NUMBER || '').replace(/\\D/g, ''),
  pairingNumber: (process.env.PAIRING_NUMBER || '').replace(/\\D/g, ''),
  timezone: process.env.TIMEZONE || 'Africa/Cairo',
  prefix: '.'
};
export const ranks = [
  'الإمبراطور','نائب الإمبراطور','الإمبراطور الأعلى','الإمبراطور الأعظم',
  'الإمبراطور الأسطوري','الإمبراطور الملكي','الإمبراطور الذهبي','الأسطورة',
  'الملك','الأمير','القائد','الجنرال','المحارب','الفارس','النخبة','المحترف','الخبير','المبتدئ'
];
