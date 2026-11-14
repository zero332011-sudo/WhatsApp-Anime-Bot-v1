import {getDB,saveDB} from '../database/db.js';
import {isOwner,isDeveloper} from '../utils/permissions.js';
import {getTargetJid} from '../utils/helpers.js';
export async function adminCommand(sock,m,text){const jid=m.key.remoteJid,s=m.key.participant||jid,cmd=text.split(/\\s+/)[0];if(cmd==='.اضافه'&&text.includes('مطور')){if(!isOwner(s)){await sock.sendMessage(jid,{text:'⛔ للمطور الأساسي فقط.'});return true;}const target=getTargetJid(m);if(!target){await sock.sendMessage(jid,{text:'اعمل منشن للشخص أو رد على رسالته.'});return true;}const db=getDB();if(!db.developers.includes(target))db.developers.push(target);saveDB(db);await sock.sendMessage(jid,{text:`👑 تمت إضافة @${target.split('@')[0]} مطورًا.`,mentions:[target]});return true;}return false;}
