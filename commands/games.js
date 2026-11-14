import { startGuess, addGuessParticipant, leaveGuess, stopGuess } from '../games/guess.js';
import { startXO, playXO } from '../games/xo.js';
import { getTargetJid } from '../utils/helpers.js';

export async function gamesCommand(sock, m, text) {
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0];
  if (cmd === '.خمن') return startGuess(sock, m);
  if (cmd === '.انهاء') {
    if (await stopGuess(sock, m)) return true;
    return playXO(sock, m, 'انهاء');
  }
  if (cmd === '.انسحب') {
    if (await leaveGuess(sock, m)) return true;
    return playXO(sock, m, 'انسحب');
  }
  if (cmd === '.مشارك') return addGuessParticipant(sock, m, getTargetJid(m));
  if (cmd === '.اكس') return startXO(sock, m, getTargetJid(m));
  if (cmd === '.لعب') return playXO(sock, m, parts[1]);
  return false;
}
