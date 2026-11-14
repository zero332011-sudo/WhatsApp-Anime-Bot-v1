import {getDB,saveDB} from '../database/db.js';
import {isDeveloper} from '../utils/permissions.js';
import {getTargetJid} from '../utils/helpers.js';
export async function moderationCommand(sock,m,text) {
  const jid=m.key.remoteJid,sender=m.key.participant||jid,cmd=text.trim().split(/\s+/)[0];
  if(!['.كتم','.فك','.فك_كتم','.فك_كتم','.فك كتم'].includes(cmd)) return false;
  if(!isDeveloper(sender)){await sock.sendMessage(jid,{text:'⛔ الأمر للمطورين فقط.'});return true;}
  const target=getTargetJid(m);
  if(!target){await sock.sendMessage(jid,{text:'اعمل منشن للعضو أو رد على رسالته بالأمر.'});return true;}
  if(isDeveloper(target)){await sock.sendMessage(jid,{text:'⛔ لا يمكن كتم المطور.'});return true;}
  const db=getDB();
  if(cmd==='.كتم') db.muted[target]={until:Date.now()+30*60*1000};
  else delete db.muted[target];
  saveDB(db);
  await sock.sendMessage(jid,{text:cmd==='.كتم'?`🔇 تم كتم @${target.split('@')[0]} لمدة 30 دقيقة.`:`🔊 تم فك كتم @${target.split('@')[0]}.`,mentions:[target]});
  return true;
}
