import fs from 'node:fs';
import path from 'node:path';
import { getDB, saveDB, getUser } from '../database/db.js';
import { normalizeAnswer, getTargetJid } from '../utils/helpers.js';

const dir = path.resolve('./anime/images');
const games = new Map();
const ROUND_MS = 30_000;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function imageFiles() {
  fs.mkdirSync(dir, { recursive: true });
  return fs.readdirSync(dir).filter(x => /\.(png|jpe?g|webp)$/i.test(x));
}
function mentionsText(ids) { return ids.length ? `\n👥 المشاركون: ${ids.map(x => `@${x.split('@')[0]}`).join(' ')}` : ''; }
async function sendRound(sock, jid, game) {
  const files = imageFiles();
  if (!files.length) {
    games.delete(jid);
    await sock.sendMessage(jid, { text: '❌ مفيش صور شخصيات في anime/images. ضيف الصور بأسماء الشخصيات بالعربي.' });
    return;
  }
  const choices = files.filter(f => files.length === 1 || path.parse(f).name !== game.lastAnswer);
  const file = choices[Math.floor(Math.random() * choices.length)];
  game.lastAnswer = path.parse(file).name;
  game.answer = normalizeAnswer(game.lastAnswer);
  game.round += 1;
  game.startedAt = Date.now();
  game.hearts = Object.fromEntries([...game.participants].map(id => [id, 3]));
  await sock.sendMessage(jid, {
    image: fs.readFileSync(path.join(dir, file)),
    caption: `🎯 خمن اسم شخصية الأنمي!\n⏳ معاكم 30 ثانية.\nاكتب «تم» للمشاركة، أو صاحب اللعبة يضيفك بالمنشن/الرد.\n🏆 أول إجابة صحيحة: 20 جنيه في البنك.${mentionsText([...game.participants])}`,
    mentions: [...game.participants]
  });
  clearTimeout(game.timer);
  game.timer = setTimeout(async () => {
    if (games.get(jid) !== game) return;
    await sock.sendMessage(jid, { text: `⏰ انتهى الوقت!\nالإجابة هي: *${game.lastAnswer}*\n🎯 جولة جديدة بعد لحظة...` });
    if (games.get(jid) !== game) return;
    await delay(1200);
    if (games.get(jid) === game) await sendRound(sock, jid, game);
  }, ROUND_MS);
}

export async function startGuess(sock, m) {
  const jid = m.key.remoteJid;
  if (games.has(jid)) { await sock.sendMessage(jid, { text: 'في لعبة خمن شغالة بالفعل. اكتب «تم» للمشاركة.' }); return true; }
  const owner = m.key.participant || jid;
  const game = { owner, participants: new Set([owner]), round: 0, hearts: {}, timer: null, lastAnswer: '' };
  games.set(jid, game);
  await sendRound(sock, jid, game);
  return true;
}

export async function guessMessage(sock, m, text) {
  const jid = m.key.remoteJid, game = games.get(jid), who = m.key.participant || jid;
  if (!game || !text || text.startsWith('.')) return false;
  if (text.trim() === 'تم') {
    game.participants.add(who);
    game.hearts[who] ??= 3;
    await sock.sendMessage(jid, { text: `✅ @${who.split('@')[0]} انضم للعبة!`, mentions: [who] });
    return true;
  }
  if (who === game.owner) {
    const target = getTargetJid(m);
    if (target) {
      game.participants.add(target); game.hearts[target] ??= 3;
      await sock.sendMessage(jid, { text: `✅ تمت إضافة @${target.split('@')[0]} للمشاركين.`, mentions: [target] });
      return true;
    }
  }
  if (!game.participants.has(who)) return false;
  if (normalizeAnswer(text) === game.answer) {
    clearTimeout(game.timer); games.delete(jid);
    const user = getUser(who);
    const db = getDB();
    db.users[who] = user;
    db.users[who].bank = (db.users[who].bank || 0) + 20;
    saveDB(db);
    await sock.sendMessage(jid, { text: `🏆 إجابة صحيحة يا @${who.split('@')[0]}!\n🎉 كسبت 20 جنيه في البنك!`, mentions: [who] });
    return true;
  }
  game.hearts[who] = (game.hearts[who] ?? 3) - 1;
  await sock.sendMessage(jid, { text: `❌ إجابة غلط يا @${who.split('@')[0]}! القلوب المتبقية: ${game.hearts[who]}/3`, mentions: [who] });
  if (game.hearts[who] <= 0) game.participants.delete(who);
  return true;
}
export async function leaveGuess(sock, m) {
  const jid = m.key.remoteJid, game = games.get(jid), who = m.key.participant || jid;
  if (!game || !game.participants.has(who)) return false;
  game.participants.delete(who); delete game.hearts[who];
  await sock.sendMessage(jid, { text: `🚪 @${who.split('@')[0]} انسحب من لعبة خمن.`, mentions: [who] });
  return true;
}
export async function stopGuess(sock, m) {
  const jid = m.key.remoteJid, game = games.get(jid), who = m.key.participant || jid;
  if (!game) return false;
  if (who !== game.owner) { await sock.sendMessage(jid, { text: 'صاحب اللعبة فقط يقدر ينهي الجولة.' }); return true; }
  endGuess(jid); await sock.sendMessage(jid, { text: '🛑 صاحب اللعبة أنهى لعبة خمن.' }); return true;
}
export async function addGuessParticipant(sock, m, target) {
  const jid = m.key.remoteJid, game = games.get(jid), sender = m.key.participant || jid;
  if (!game) return false;
  if (sender !== game.owner) { await sock.sendMessage(jid, { text: 'صاحب اللعبة فقط يقدر يضيف مشاركين.' }); return true; }
  if (!target) { await sock.sendMessage(jid, { text: 'اعمل منشن للعضو أو رد على رسالته بالأمر .مشارك' }); return true; }
  game.participants.add(target); game.hearts[target] ??= 3;
  await sock.sendMessage(jid, { text: `✅ @${target.split('@')[0]} بقى مشارك في اللعبة.`, mentions: [target] });
  return true;
}
export function endGuess(jid) { const game = games.get(jid); if (game) clearTimeout(game.timer); return games.delete(jid); }
