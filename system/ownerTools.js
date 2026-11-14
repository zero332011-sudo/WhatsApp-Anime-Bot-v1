import {getDB,saveDB} from '../database/db.js';
import {isOwner} from '../utils/permissions.js';
export async function ownerTools(sock,m,text) {
 const jid=m.key.remoteJid,sender=m.key.participant||jid;
 const cmd=['.اضافه ايموجي','.اضافه ملصق','.حذف ايموجي','.حذف ملصق'].find(x=>text.startsWith(x));
 if(!cmd)return false;
 if(!isOwner(sender)){await sock.sendMessage(jid,{text:'⛔ الأمر للمطور الأساسي فقط.'});return true;}
 const db=getDB(),ctx=m.message?.extendedTextMessage?.contextInfo,val=text.slice(cmd.length).trim();
 if(cmd.includes('ملصق')){
  const sticker=ctx?.quotedMessage?.stickerMessage;
  if(!sticker?.fileSha256){await sock.sendMessage(jid,{text:'رد على الملصق نفسه بالأمر حتى أقدر أحفظ بصمته.'});return true;}
  const hash=Buffer.from(sticker.fileSha256).toString('base64');db.blockedStickers ||= [];
  if(cmd.startsWith('.اضافه')){if(!db.blockedStickers.includes(hash))db.blockedStickers.push(hash);}
  else db.blockedStickers=db.blockedStickers.filter(x=>x!==hash);
 }else{
  if(!val){await sock.sendMessage(jid,{text:'اكتب الإيموجي بعد الأمر.'});return true;}
  db.blockedEmojis ||= [];
  if(cmd.startsWith('.اضافه')){if(!db.blockedEmojis.includes(val))db.blockedEmojis.push(val);}
  else db.blockedEmojis=db.blockedEmojis.filter(x=>x!==val);
 }
 saveDB(db);await sock.sendMessage(jid,{text:'✅ تم تحديث قائمة المحظورات.'});return true;
}
