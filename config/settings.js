import 'dotenv/config';

const digits = value => String(value || '').replace(/\D/g, '');

function normalizeEgyptianNumber(value, fallback) {
  let number = digits(value) || fallback;
  if (number.startsWith('0020')) number = number.slice(2);
  else if (number.startsWith('0')) number = '20' + number.slice(1);
  else if (!number.startsWith('20')) number = '20' + number;
  return number;
}

export const config = {
  name: process.env.BOT_NAME || 'Anime Bot',
  owner: normalizeEgyptianNumber(process.env.OWNER_NUMBER, '201032219184'),
  pairingNumber: normalizeEgyptianNumber(process.env.PAIRING_NUMBER, '201154684341'),
  timezone: process.env.TIMEZONE || 'Africa/Cairo',
  prefix: '.'
};

export const ranks = [
  'الإمبراطور','نائب الإمبراطور','الإمبراطور الأعلى','الإمبراطور الأعظم',
  'الإمبراطور الأسطوري','الإمبراطور الملكي','الإمبراطور الذهبي','الأسطورة',
  'الملك','الأمير','القائد','الجنرال','المحارب','الفارس','النخبة','المحترف','الخبير','المبتدئ'
];
