import fs from 'node:fs';
import path from 'node:path';
const dir='./database';
const file=path.join(dir,'data.json');
const defaults=()=>({users:{},groups:{},developers:[],muted:{},blockedWords:[],blockedEmojis:[],blockedStickers:[],anime:{},games:{},marriages:{},transfers:[]});
fs.mkdirSync(dir,{recursive:true});
if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(defaults(),null,2));
export function getDB(){
 let data={};
 try{data=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
 return {...defaults(),...data,
  users:data.users||{},groups:data.groups||{},developers:data.developers||[],muted:data.muted||{},
  anime:data.anime||{},games:data.games||{},blockedWords:data.blockedWords||[],
  blockedEmojis:data.blockedEmojis||[],blockedStickers:data.blockedStickers||[],
  marriages:data.marriages||{},transfers:data.transfers||[]};
}
export function saveDB(data){
 const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2));fs.renameSync(tmp,file);
}
function numberOf(jid){return String(jid||'').split('@')[0].split(':')[0].replace(/\D/g,'');}
export function getUser(jid){
 const db=getDB();
 if(!db.users[jid]){
  const owner=numberOf(jid)===String(process.env.OWNER_NUMBER||'201032219184').replace(/\D/g,'');
  const developer=owner||db.developers.some(x=>numberOf(x)===numberOf(jid));
  db.users[jid]={jid,nickname:'عضو جديد',rank:17,bank:developer?100:40,wallet:0,hearts:3,warnings:0};
  saveDB(db);
 }
 return db.users[jid];
}
