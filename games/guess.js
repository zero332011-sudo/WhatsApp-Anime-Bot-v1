import fs from 'node:fs';
import path from 'node:path';
import { getTargetJid, normalizeAnswer } from '../utils/helpers.js';

const imageRoot = path.resolve('./anime/images');
const games = new Map();
const ROUND_MS = 30_000;
const HEARTS = 3;

function listImages(folder = imageRoot) {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) return listImages(full);
    return /\.(png|jpe?g|webp)$/i.test(entry.name) ? [full] : [];
  });
}
function answerAliases(file) {
  const name = path.parse(file).name;
  const aliasesFile = path.resolve('./anime/guessAliases.json');
  let aliases = {};
  try { aliases = JSON.parse(fs.readFileSync(aliasesFile, 'utf8')); } catch {}
  const direct = aliases[name] || [];
  return new Set([normalizeAnswer(name), ...direct.map(normalizeAnswer)].filter(Boolean));
}
function heartsLine(game) {
  return [...game.participants].map(id => {
    const n = Math.max(0, game.hearts[id] || 0);
    return '@' + id.split('@')[0] + ' ' + '❤️'.repeat(n) + '🖤'.repeat(HEARTS - n);
  }).join('\n');
}
async function finish(sock, jid, game, winner) {
  clearTimeout(game.timer);
  games.delete(jid);
  const remaining = game.hearts[winner] || 0;
  await sock.sendMessage(jid, {
    text: `╭━━━〔 🏆 بطل التخمين 〕━━━╮\n┃ 👑 الفائز: @${winner.split('@')[0]}\n┃ ❤️ القلوب المتبقية: ${remaining}\n┃ 🎉 أنت آخر ناجٍ!\n╰━━━━━━━━━━━━━━━━━━━━╯`,
    mentions: [winner]
  });
}
async function nextRound(sock, jid, game) {
  if (games.get(jid) !== game) return;
  if (game.round > 0 && game.participants.size <= 1) {
    const winner = [...game.participants][0];
    if (winner) return finish(sock, jid, game, winner);
    clearTimeout(game.timer); games.delete(jid);
    await sock.sendMessage(jid, { text: '☠️ خرج جميع المشاركين. انتهت اللعبة بلا فائز.' });
    return;
  }
  const files = listImages();
  if (!files.length) {
    games.delete(jid);
    await sock.sendMessage(jid, { text: '❌ لا توجد صور. أضف صور الشخصيات داخل مجلدات anime/images بأسماء عربية.' });
    return;
  }
  let choices = files.filter(file => !game.used.has(file));
  if (!choices.length) { game.used.clear(); choices = files; }
  const file = choices[Math.floor(Math.random() * choices.length)];
  game.used.add(file);
  game.answer = answerAliases(file);
  game.answerName = path.parse(file).name;
  game.round++;
  await sock.sendMessage(jid, {
    image: fs.readFileSync(file),
    caption: `🎯 خمن اسم شخصية الأنمي!\n⏳ الوقت: 30 ثانية\n❤️ القلوب:\n${heartsLine(game)}\n\n✍️ أول إجابة صحيحة تكسب الجولة!`,
    mentions: [...game.participants]
  });
  clearTimeout(game.timer);
  game.timer = setTimeout(async () => {
    if (games.get(jid) !== game) return;
    for (const id of [...game.participants]) {
      game.hearts[id] = Math.max(0, (game.hearts[id] ?? HEARTS) - 1);
      if (game.hearts[id] <= 0) game.participants.delete(id);
    }
    await sock.sendMessage(jid, {
      text: `⏰ انتهى الوقت!\n✅ الإجابة: *${game.answerName}*\n☠️ من انتهت قلوبه خرج من اللعبة.\n❤️ القلوب المتبقية:\n${heartsLine(game)}`,
      mentions: [...new Set([...game.participants, ...(selected ? [selected] : [])])]
    });
    await nextRound(sock, jid, game);
  }, ROUND_MS);
}

export async function startGuess(sock, m) {
  const jid = m.key.remoteJid;
  if (!jid.endsWith('@g.us')) { await sock.sendMessage(jid, { text: '🎯 لعبة خمن متاحة في المجموعات فقط.' }); return true; }
  if (games.has(jid)) { await sock.sendMessage(jid, { text: '🎯 توجد لعبة خمن جارية بالفعل. اكتب تم للمشاركة.' }); return true; }
  const owner = m.key.participant || jid;
  const game = { owner, participants: new Set([owner]), eliminated: new Set(), hearts: { [owner]: HEARTS }, used: new Set(), round: 0, answer: new Set(), timer: null };
  games.set(jid, game);
  await nextRound(sock, jid, game);
  return true;
}

export async function guessMessage(sock, m, text) {
  const jid = m.key.remoteJid, game = games.get(jid), who = m.key.participant || jid;
  if (!game || !text || text.startsWith('.')) return false;
  if (text.trim() === 'تم') {
    if (!game.participants.has(who)) {
      if (game.eliminated.has(who)) {
        await sock.sendMessage(jid, { text: '⛔ خرجت من هذه اللعبة ولا يمكنك الانضمام مرة أخرى.' });
        return true;
      }
      game.participants.add(who);
      game.hearts[who] = HEARTS;
      await sock.sendMessage(jid, { text: `✅ @${who.split('@')[0]} انضم للعبة! ❤️❤️❤️`, mentions: [who] });
    }
    return true;
  }
  if (who === game.owner) {
    const target = getTargetJid(m);
    if (target && !game.participants.has(target)) {
      if (game.eliminated.has(target)) {
        await sock.sendMessage(jid, { text: '⛔ هذا العضو خرج من اللعبة ولا يمكنه العودة.' });
        return true;
      }
      game.participants.add(target); game.hearts[target] = HEARTS;
      await sock.sendMessage(jid, { text: `✅ تمت إضافة @${target.split('@')[0]} للمشاركين. ❤️❤️❤️`, mentions: [target] });
      return true;
    }
  }
  if (!game.participants.has(who)) return false;
  if (game.answer.has(normalizeAnswer(text))) {
    clearTimeout(game.timer);
    for (const id of [...game.participants]) {
      if (id !== who) {
        game.hearts[id] = Math.max(0, (game.hearts[id] ?? HEARTS) - 1);
        if (game.hearts[id] <= 0) game.participants.delete(id);
      }
    }
    await sock.sendMessage(jid, {
      text: `🏆 إجابة صحيحة يا @${who.split('@')[0]}!\n🎯 الإجابة: ${game.answerName}\n❤️ الفائز احتفظ بقلوبه.\n☠️ الخاسرون فقدوا قلبًا.\n\n❤️ القلوب:\n${heartsLine(game)}`,
      mentions: [...game.participants]
    });
    await nextRound(sock, jid, game);
    return true;
  }
  await sock.sendMessage(jid, { text: `❌ إجابة غير صحيحة يا @${who.split('@')[0]}، حاول مرة أخرى قبل انتهاء الوقت.`, mentions: [who] });
  return true;
}
export async function leaveGuess(sock, m) {
  const jid = m.key.remoteJid, game = games.get(jid), who = m.key.participant || jid;
  if (!game || !game.participants.has(who)) return false;
  game.participants.delete(who); game.eliminated.add(who); delete game.hearts[who];
  await sock.sendMessage(jid, { text: `🚪 @${who.split('@')[0]} انسحب من لعبة خمن.`, mentions: [who] });
  if (game.participants.size <= 1) await nextRound(sock, jid, game);
  return true;
}
export async function stopGuess(sock, m) {
  const jid = m.key.remoteJid, game = games.get(jid), who = m.key.participant || jid;
  if (!game) return false;
  if (who !== game.owner) { await sock.sendMessage(jid, { text: 'صاحب اللعبة فقط يقدر ينهي الجولة.' }); return true; }
  clearTimeout(game.timer); games.delete(jid);
  await sock.sendMessage(jid, { text: '🛑 صاحب اللعبة أنهى لعبة خمن.' }); return true;
}
export async function addGuessParticipant(sock, m, target) {
  const jid = m.key.remoteJid, game = games.get(jid), sender = m.key.participant || jid;
  if (!game) return false;
  if (sender !== game.owner) { await sock.sendMessage(jid, { text: 'صاحب اللعبة فقط يقدر يضيف مشاركين.' }); return true; }
  if (!target) { await sock.sendMessage(jid, { text: 'اعمل منشن للعضو أو رد على رسالته بالأمر .مشارك' }); return true; }
  if (game.eliminated.has(target)) { await sock.sendMessage(jid, { text: '⛔ هذا العضو خرج من اللعبة ولا يمكنه العودة.' }); return true; }
  if (!game.participants.has(target)) { game.participants.add(target); game.hearts[target] = HEARTS; }
  await sock.sendMessage(jid, { text: `✅ @${target.split('@')[0]} بقى مشارك في اللعبة. ❤️❤️❤️`, mentions: [target] });
  return true;
}
export function endGuess(jid) { const game = games.get(jid); if (game) clearTimeout(game.timer); return games.delete(jid); }
