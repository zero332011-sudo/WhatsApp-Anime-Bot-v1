import {generalCommand} from '../commands/general.js';
import {adminCommand} from '../commands/admin.js';
import {moderationCommand} from '../commands/moderation.js';
import {economyCommand} from '../commands/economy.js';
import {rankCommand} from '../commands/ranks.js';
import {animeCommand} from '../commands/anime.js';
import {gamesCommand} from '../commands/games.js';
import {ownerTools} from '../systems/ownerTools.js';
import {marriageCommand} from '../systems/marriage.js';
export async function commandHandler(sock,m,text){if(!text.startsWith('.'))return false;const cmd=text.split(/\\s+/)[0];for(const fn of [async()=>adminCommand(sock,m,text),async()=>moderationCommand(sock,m,text),async()=>ownerTools(sock,m,text),async()=>economyCommand(sock,m,text),async()=>rankCommand(sock,m,text),async()=>animeCommand(sock,m,text),async()=>gamesCommand(sock,m,text),async()=>marriageCommand(sock,m,cmd.slice(1)),async()=>generalCommand(sock,m,text)]){if(await fn())return true;}await sock.sendMessage(m.key.remoteJid,{text:'❌ أمر غير معروف. اكتب .الاوامر'});return false;}
