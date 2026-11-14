import {getDB} from '../database/db.js';
import {isDeveloper} from '../utils/permissions.js';
import {addWarning,isMuted} from './warnings.js';
const DEFAULT_BLOCKED_WORDS=['كسمك','كس امك','ابن المتناكة','ابن الشرموطة','شرموط','شرموطة','متناك','قحبة','يا عرص','يلعن دينك'];
export async function filterMessage(sock,m,text) {
 const jid=m.key.remoteJid,sender=m.key.participant||jid;
 if(!jid.endsWith('@g.us')||isDeveloper(sender))return false;
 if(isMuted(sender))return true;
 const db=getDB(),body=String(text||'').toLowerCase(),sticker=m.message?.stickerMessage;
 const hash=sticker?.fileSha256?Buffer.from(sticker.fileSha256).toString('base64'):null;
 const badWord=[...DEFAULT_BLOCKED_WORDS,...(db.blockedWords||[])].some(w=>w&&body.includes(w.toLowerCase()));
 const badEmoji=(db.blockedEmojis||[]).some(e=>e&&String(text||'').includes(e));
 const badSticker=!!hash&&(db.blockedStickers||[]).includes(hash);
 if(!badWord&&!badEmoji&&!badSticker)return false;
 const result=addWarning(jid,sender);
 await sock.sendMessage(jid,{text:result.muted?`🔇 @${sender.split('@')[0]} تم كتمه 30 دقيقة بعد 3 إنذارات.`:`⚠️ @${sender.split('@')[0]} ممنوع هذا المحتوى. الإنذار ${result.warnings}/3`,mentions:[sender]});
 return true;
}
