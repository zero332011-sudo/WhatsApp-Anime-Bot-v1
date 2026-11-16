import fs from 'node:fs';
import path from 'node:path';

const dir = './database';
const file = path.join(dir, 'data.json');
const defaults = () => ({
  users: {}, groups: {}, developers: [], ownerJids: [], botName: '', messageStats: {}, muted: {}, blockedWords: [],
  blockedEmojis: [], blockedStickers: [], anime: {}, games: {},
  marriages: {}, transfers: []
});

fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaults(), null, 2));

let cache = null;

function normalize(data = {}) {
  const base = defaults();
  return {
    ...base,
    ...data,
    users: data.users || {},
    groups: data.groups || {},
    developers: data.developers || [],
    ownerJids: data.ownerJids || [],
    botName: data.botName || '',
    messageStats: data.messageStats || {},
    muted: data.muted || {},
    anime: data.anime || {},
    games: data.games || {},
    blockedWords: data.blockedWords || [],
    blockedEmojis: data.blockedEmojis || [],
    blockedStickers: data.blockedStickers || [],
    marriages: data.marriages || {},
    transfers: data.transfers || []
  };
}

export function getDB() {
  if (cache) return cache;
  try {
    cache = normalize(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (error) {
    console.error('تعذر قراءة قاعدة البيانات، سيتم استخدام بيانات افتراضية:', error);
    cache = defaults();
  }
  return cache;
}

export function saveDB(data) {
  cache = normalize(data);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, file);
}

function numberOf(jid) {
  return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

export function getUser(jid) {
  const db = getDB();
  if (!db.users[jid]) {
    const owner = numberOf(jid) === String(process.env.OWNER_NUMBER || '201032219184').replace(/\D/g, '');
    const developer = owner || db.developers.some(x => numberOf(x) === numberOf(jid));
    db.users[jid] = {
      jid, nickname: 'عضو جديد', rank: 17,
      bank: developer ? 100 : 40, wallet: 0, hearts: 3, warnings: 0
    };
    saveDB(db);
  }
  return db.users[jid];
}
