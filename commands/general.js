import {getDB,getUser,saveDB} from '../database/db.js';
import {getTargetJid} from '../utils/helpers.js';
import {ranks,config} from '../config/settings.js';
import {isDeveloper} from '../utils/permissions.js';
import {showMedia} from '../system/media.js';
export async function generalCommand(sock,m,text) {
  const jid=m.key.remoteJid,s=m.key.participant||jid,cmd=text.trim().split(/\s+/)[0];
  if(['.الاوامر','.اوامر'].includes(cmd)) {
    await sock.sendMessage(jid,{text:'🍥 '+config.name+'\n\n🎮 .اكس @خصم | .خمن | تم للمشاركة | .مشارك @عضو | .لعب رقم | .انسحب | .انهاء\n💰 .بنك | .محفظه | .تحويل @عضو مبلغ\n👤 .معلومات | .لقب اسم\n🍥 .انمي | .حلقات الأنمي|القسم | .حلقه الأنمي|القسم|رقم\n📎 .عرض (بالرد على الوسائط)\n💍 .زواج @شخصين | .طلاق\n🕒 .وقت | .التاريخ | .حاله'});
    return true;
  }
  if(cmd==='.وقت'||cmd==='.التاريخ'){const now=new Date().toLocaleString('ar-EG',{timeZone:config.timezone});await sock.sendMessage(jid,{text:'🕒 '+now});return true;}
  if(cmd==='.حاله'){await sock.sendMessage(jid,{text:'🟢 البوت يعمل\n⏱️ مدة التشغيل: '+Math.floor(process.uptime())+' ثانية'});return true;}
  if(cmd==='.عرض') return showMedia(sock,m);
  if(cmd==='.احصائيات') {
    if(!jid.endsWith('@g.us')) { await sock.sendMessage(jid,{text:'📊 الإحصائيات متاحة داخل المجموعات فقط.'}); return true; }
    const db=getDB(), stats=db.messageStats?.[jid]||{total:0,members:{}};
    const top=Object.entries(stats.members||{}).sort((a,b)=>b[1]-a[1]).slice(0,3);
    const lines=top.length?top.map(([id,count,i])=>{const n=top.findIndex(x=>x[0]===id)+1;return n+'. @'+id.split('@')[0]+' — '+count+' رسالة';}).join('\\n'):'لا توجد بيانات نشاط بعد.';
    await sock.sendMessage(jid,{text:'📊 إحصائيات المجموعة\\n📅 '+new Date().toLocaleDateString('ar-EG',{timeZone:config.timezone})+'\\n💬 إجمالي الرسائل المسجلة: '+stats.total+'\\n🏆 أكثر 3 أعضاء نشاطًا:\\n'+lines,mentions:top.map(x=>x[0])});
    return true;
  }
  if(cmd==='.معلومات'){
    const target=getTargetJid(m)||s,x=getUser(target);
    const caption='👤 '+x.nickname+'\n📱 '+target.split('@')[0]+'\n🆔 '+target+'\n👑 '+(ranks[x.rank]||'غير محددة')+'\n🏦 '+x.bank+' جنيه\n👛 '+x.wallet+' جنيه';
    try { const url=await sock.profilePictureUrl(target,'image'); await sock.sendMessage(jid,{image:{url},caption,mentions:[target]}); }
    catch { await sock.sendMessage(jid,{text:caption,mentions:[target]}); }
    return true;
  }
  if((cmd==='.تفعيل'||cmd==='.ايقاف')&&text.includes('الصلاة')) {
    if(!isDeveloper(s)){await sock.sendMessage(jid,{text:'⛔ للمطورين فقط.'});return true;}
    if(!jid.endsWith('@g.us')){await sock.sendMessage(jid,{text:'الأمر داخل المجموعة فقط.'});return true;}
    const db=getDB();db.groups[jid] ||= {};db.groups[jid].prayerEnabled=cmd==='.تفعيل';saveDB(db);
    await sock.sendMessage(jid,{text:cmd==='.تفعيل'?'🕌 تم تفعيل تنبيهات الصلاة للمجموعة.':'تم إيقاف تنبيهات الصلاة.'});return true;
  }
  return false;
}
