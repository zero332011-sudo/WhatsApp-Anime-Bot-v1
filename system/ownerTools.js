import {getDB,saveDB} from '../database/db.js';
import {isOwner} from '../utils/permissions.js';
export async function ownerTools(sock,m,text){
 const jid=m.key.remoteJid, sender=m.key.participant||jid;
 const cmd=['.اضافه ايموجي','.اضافه ملصق','.حذف ايموجي','.حذف ملصق'].find(x=>text.startsWith(x));
 if(!cmd)return false;
 if(!isOwner(sender)){await sock.sendMessage(jid,{text:'⛔ الأمر للمطور الأساسي فقط.'});return true;}
 const db=getDB(), ctx=m.message?.extendedTextMessage?.contextInfo;
 const val=text.slice(cmd.length).trim();
 if(cmd.includes('ملصق')){
   if(!ctx?.stanzaId){await sock.sendMessage(jid,{text:'ارسل الأمر ردًا على الملصق المطلوب.'});return true;}
   db.blockedStickers ||= [];
   const key=ctx.stanzaId;
   if(cmd.startsWith('.اضافه'))db.blockedStickers.push(key);else db.blockedStickers=db.blockedStickers.filter(x=>x!==key);
 } else {
   if(!val){await sock.sendMessage(jid,{text:'اكتب الإيموجي بعد الأمر.'});return true;}
   db.blockedEmojis ||= [];
   if(cmd.startsWith('.اضافه')){if(!db.blockedEmojis.includes(val))db.blockedEmojis.push(val);}else db.blockedEmojis=db.blockedEmojis.filter(x=>x!==val);
 }
 saveDB(db);await sock.sendMessage(jid,{text:'✅ تم تحديث قائمة المحظورات.'});return true;
}
