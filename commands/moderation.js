import {getDB,saveDB} from '../database/db.js';
import {isDeveloper} from '../utils/permissions.js';
import {getTargetJid} from '../utils/helpers.js';
export async function moderationCommand(sock,m,text) {
  const jid=m.key.remoteJid,sender=m.key.participant||jid;
  const normalized=text.trim().replace(/\s+/g,' ');
  const cmd=normalized.startsWith('.فك كتم')?'.فك كتم':normalized.split(' ')[0];
  if(!['.كتم','.فك','.فك_كتم','.فك كتم'].includes(cmd)) return false;
  if(!isDeveloper(sender)){await sock.sendMessage(jid,{text:'⛔ الأمر للمطورين فقط.'});return true;}
  const target=getTargetJid(m);
  if(!target){await sock.sendMessage(jid,{text:'اعمل منشن للعضو أو رد على رسالته بالأمر.'});return true;}
  if(isDeveloper(target)){await sock.sendMessage(jid,{text:'⛔ لا يمكن كتم المطور.'});return true;}
  const db=getDB(),shouldMute=cmd==='.كتم';
  if(shouldMute) db.muted[target]={until:Date.now()+30*60*1000,group:jid};
  else delete db.muted[target];
  saveDB(db);
  await sock.sendMessage(jid,{text:shouldMute?'🔇 تم كتم @'+target.split('@')[0]+' لمدة 30 دقيقة.':'🔊 تم فك كتم @'+target.split('@')[0]+'.',mentions:[target]});
  return true;
}
