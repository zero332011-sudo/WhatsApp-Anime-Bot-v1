import {getDB} from '../database/db.js';
import {isDeveloper} from '../utils/permissions.js';
import {addWarning,isMuted} from './warnings.js';
export async function filterMessage(sock,m,text) {
  const jid=m.key.remoteJid,sender=m.key.participant||jid;
  if(!jid.endsWith('@g.us')||isDeveloper(sender)) return false;
  if(isMuted(sender)) return true;
  const db=getDB(),lower=String(text||'').toLowerCase();
  const bad=(db.blockedWords||[]).some(w=>w&&lower.includes(w.toLowerCase()))||(db.blockedEmojis||[]).some(e=>e&&String(text||'').includes(e));
  if(!bad) return false;
  const result=addWarning(jid,sender);
  await sock.sendMessage(jid,{text:result.muted?`🔇 @${sender.split('@')[0]} تم كتمه 30 دقيقة بعد 3 إنذارات.`:`⚠️ @${sender.split('@')[0]} ممنوع هذا المحتوى. الإنذار ${result.warnings}/3`,mentions:[sender]});
  return true;
}
