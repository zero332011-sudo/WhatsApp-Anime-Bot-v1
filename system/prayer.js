import {getDB} from '../database/db.js';
import {lockGroupForPrayer} from './groupLock.js';
const sent=new Set();let interval=null;
export async function checkPrayer(sock) {
 try {
  const response=await fetch('https://api.aladhan.com/v1/timingsByCity?city=Sohag&country=Egypt&method=5');
  if(!response.ok)return;
  const data=await response.json(),timings=data.data.timings,date=data.data.date.gregorian.date;
  const now=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
  const names={Fajr:'الفجر',Dhuhr:'الظهر',Asr:'العصر',Maghrib:'المغرب',Isha:'العشاء'};
  const prayer=Object.entries(names).find(([key])=>String(timings[key]).slice(0,5)===now);
  if(!prayer||sent.has(date+prayer[0]))return;
  sent.add(date+prayer[0]);const db=getDB();
  for(const [jid,settings] of Object.entries(db.groups)){
   if(!settings.prayerEnabled)continue;
   try{
    const meta=await sock.groupMetadata(jid),mentions=meta.participants.map(x=>x.id);
    await sock.sendMessage(jid,{text:`🕌 حان الآن موعد صلاة ${prayer[1]} بتوقيت سوهاج. تقبل الله منكم.\n`+mentions.map(x=>'@'+x.split('@')[0]).join(' '),mentions});
    await lockGroupForPrayer(sock,jid);
   }catch(error){console.error('Prayer group:',error);}
  }
  if(sent.size>20)sent.clear();
 }catch(error){console.error('Prayer check:',error);}
}
export function startPrayerSystem(sock){if(interval)clearInterval(interval);checkPrayer(sock);interval=setInterval(()=>checkPrayer(sock),60000);return interval;}
