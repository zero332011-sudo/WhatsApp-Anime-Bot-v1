import { startGuess, addGuessParticipant, leaveGuess, stopGuess } from '../games/guess.js';
import { startXO, playXO } from '../games/xo.js';
import { getTargetJid } from '../utils/helpers.js';
export async function gamesCommand(sock, m, text) {
  const cmd = text.split(/\s+/)[0];
  if (cmd === '.خمن') return startGuess(sock, m);
  if (cmd === '.انهاء') { const stopped = await stopGuess(sock, m); if (stopped) return true; return playXO(sock, m, 'انهاء'); }
  if (cmd === '.انسحب') { const left = await leaveGuess(sock, m); if (left) return true; return playXO(sock, m, 'انسحب'); }
  if (cmd === '.مشارك') return addGuessParticipant(sock, m, getTargetJid(m));
  if (cmd === '.اكس') return startXO(sock, m, getTargetJid(m));
  if (cmd === '.لعب') return playXO(sock, m, text.split(/\s+/)[1]);
  return false;
}
