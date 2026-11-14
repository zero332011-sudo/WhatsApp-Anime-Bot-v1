import {getDB,saveDB} from '../database/db.js';
import {isDeveloper} from '../utils/permissions.js';
export async function animeCommand(sock,m,text) {
  const jid=m.key.remoteJid,sender=m.key.participant||jid,parts=text.trim().split(/\s+/),cmd=parts[0],db=getDB();
  if(cmd==='.انمي') {
    const names=Object.keys(db.anime);
    await sock.sendMessage(jid,{text:names.length?'🍥 مكتبة الأنمي\n'+names.map((x,i)=>`${i+1}. ${x} — ${Object.keys(db.anime[x].sections||{}).length} قسم`).join('\n'):'المكتبة فارغة.'});
    return true;
  }
  if(!['.اضافه','.حذف'].includes(cmd)) return false;
  if(!isDeveloper(sender)){await sock.sendMessage(jid,{text:'⛔ إدارة مكتبة الأنمي للمطورين فقط.'});return true;}
  if(parts[1]==='انمي'&&cmd==='.اضافه') {
    const name=parts.slice(2).join(' ').trim();if(!name)return true;
    db.anime[name] ||= {sections:{}};saveDB(db);await sock.sendMessage(jid,{text:`✅ تمت إضافة الأنمي: ${name}`});return true;
  }
  if(parts[1]==='قسم'&&cmd==='.اضافه') {
    const [anime,section]=parts.slice(2).join(' ').split('|').map(x=>x.trim());
    if(!anime||!section||!db.anime[anime]){await sock.sendMessage(jid,{text:'الاستخدام: .اضافه قسم اسم_الانمي|اسم_القسم'});return true;}
    db.anime[anime].sections ||= {};db.anime[anime].sections[section] ||= [];saveDB(db);
    await sock.sendMessage(jid,{text:`✅ تمت إضافة قسم ${section} داخل ${anime}.`});return true;
  }
  if(parts[1]==='قسم'&&cmd==='.حذف') {
    const [anime,section]=parts.slice(2).join(' ').split('|').map(x=>x.trim());
    if(!db.anime[anime]?.sections?.[section]){await sock.sendMessage(jid,{text:'القسم غير موجود.'});return true;}
    delete db.anime[anime].sections[section];saveDB(db);await sock.sendMessage(jid,{text:'🗑️ تم حذف القسم.'});return true;
  }
  if(parts[1]==='انمي'&&cmd==='.حذف') {
    const name=parts.slice(2).join(' ').trim();if(!db.anime[name]){await sock.sendMessage(jid,{text:'الأنمي غير موجود.'});return true;}
    delete db.anime[name];saveDB(db);await sock.sendMessage(jid,{text:'🗑️ تم حذف الأنمي وأقسامه.'});return true;
  }
  return false;
}
